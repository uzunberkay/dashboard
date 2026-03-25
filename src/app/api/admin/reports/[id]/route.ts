import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { canAccessSavedViewScope } from "@/lib/admin/permissions"
import { deleteAdminSavedView, updateAdminSavedView } from "@/lib/admin/mutations"
import { prisma } from "@/lib/prisma"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminSavedViewUpdateSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("savedViews:manage")
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const { id } = await context.params
    const existing = await prisma.adminSavedView.findUnique({
      where: { id },
      select: {
        id: true,
        scope: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Kayitli gorunum bulunamadi" }, { status: 404 })
    }

    if (!canAccessSavedViewScope(adminSession.admin.role, existing.scope)) {
      return NextResponse.json({ error: "Bu gorunumu duzenleme yetkiniz yok" }, { status: 403 })
    }

    const body = await request.json()
    const data = adminSavedViewUpdateSchema.parse(body)

    const savedView = await updateAdminSavedView({
      actorUserId: adminSession.admin.id,
      id,
      name: data.name,
      filters: data.filters,
      isDefault: data.isDefault,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    if (!savedView) {
      return NextResponse.json({ error: "Kayitli gorunum bulunamadi" }, { status: 404 })
    }

    return NextResponse.json(savedView)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz gorunum verisi"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("savedViews:manage")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params
  const existing = await prisma.adminSavedView.findUnique({
    where: { id },
    select: {
      id: true,
      scope: true,
    },
  })

  if (!existing) {
    return NextResponse.json({ error: "Kayitli gorunum bulunamadi" }, { status: 404 })
  }

  if (!canAccessSavedViewScope(adminSession.admin.role, existing.scope)) {
    return NextResponse.json({ error: "Bu gorunumu silme yetkiniz yok" }, { status: 403 })
  }

  const deleted = await deleteAdminSavedView({
    actorUserId: adminSession.admin.id,
    id,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  })

  if (!deleted) {
    return NextResponse.json({ error: "Kayitli gorunum bulunamadi" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
