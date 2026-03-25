import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { revokeManagedUserSessions } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("users:sessions:revoke")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params
  const result = await revokeManagedUserSessions({
    actor: {
      id: adminSession.admin.id,
      role: adminSession.admin.role,
    },
    targetUserId: id,
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
}
