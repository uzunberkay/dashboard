import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { requestBulkUserUpdate } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminBulkActionSchema } from "@/lib/validations"

export async function POST(request: NextRequest) {
  const adminSession = await requireAdminApiSession("users:bulk:update")
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminBulkActionSchema.parse(body)
    const result = await requestBulkUserUpdate({
      actor: {
        id: adminSession.admin.id,
        role: adminSession.admin.role,
      },
      userIds: data.userIds,
      action: data.action,
      reason: data.reason,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    if (!result.ok) {
      const status =
        result.code === "not_found"
          ? 404
          : result.code === "permission_denied"
            ? 403
            : 400
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
