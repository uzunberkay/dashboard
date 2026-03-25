import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { canAccessSavedViewScope } from "@/lib/admin/permissions"
import { getAdminReportsData } from "@/lib/admin/data"
import { createAdminSavedView } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminSavedViewCreateSchema } from "@/lib/validations"

export async function GET() {
  const adminSession = await requireAdminApiSession("reports:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  return NextResponse.json(await getAdminReportsData(adminSession.admin.role))
}

export async function POST(request: NextRequest) {
  const adminSession = await requireAdminApiSession("savedViews:manage")
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminSavedViewCreateSchema.parse(body)

    if (!canAccessSavedViewScope(adminSession.admin.role, data.scope)) {
      return NextResponse.json({ error: "Bu ekran scope'u icin gorunum kaydetme yetkiniz yok" }, { status: 403 })
    }

    const savedView = await createAdminSavedView({
      actorUserId: adminSession.admin.id,
      scope: data.scope,
      name: data.name,
      filters: data.filters,
      isDefault: data.isDefault,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json(savedView, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz gorunum verisi"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
