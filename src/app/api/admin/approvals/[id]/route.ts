import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import {
  approveAdminApprovalRequest,
  rejectAdminApprovalRequest,
} from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminApprovalDecisionSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("approvals:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminApprovalDecisionSchema.parse(body)
    const { id } = await context.params

    const result =
      data.decision === "approve"
        ? await approveAdminApprovalRequest({
            actor: {
              id: adminSession.admin.id,
              role: adminSession.admin.role,
            },
            requestId: id,
            reason: data.reason,
            ipAddress: getClientIp(request),
            userAgent: getUserAgent(request),
          })
        : await rejectAdminApprovalRequest({
            actor: {
              id: adminSession.admin.id,
              role: adminSession.admin.role,
            },
            requestId: id,
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
            : result.code === "already_processed"
              ? 409
              : 400
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz onay karari"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
