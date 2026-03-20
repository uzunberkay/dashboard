import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminReportsData } from "@/lib/admin/data"
import { createAdminSavedView } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminSavedViewCreateSchema } from "@/lib/validations"

export async function GET() {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  return NextResponse.json(await getAdminReportsData())
}

export async function POST(request: NextRequest) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminSavedViewCreateSchema.parse(body)

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
