import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { deleteAdminSavedView, updateAdminSavedView } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminSavedViewUpdateSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminSavedViewUpdateSchema.parse(body)
    const { id } = await context.params

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
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params
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
