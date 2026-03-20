import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminSettingsData } from "@/lib/admin/data"
import { updateAdminSettings } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminSettingsUpdateSchema } from "@/lib/validations"

export async function GET() {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const data = await getAdminSettingsData({
    name: adminSession.admin.name,
    email: adminSession.admin.email,
  })

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const values = adminSettingsUpdateSchema.parse(body)

    await updateAdminSettings({
      actorUserId: adminSession.admin.id,
      values,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    const data = await getAdminSettingsData({
      name: adminSession.admin.name,
      email: adminSession.admin.email,
    })

    return NextResponse.json(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz ayar verisi"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
