import { NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminApprovalQueueData } from "@/lib/admin/approvals-data"

export async function GET() {
  const adminSession = await requireAdminApiSession("approvals:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const data = await getAdminApprovalQueueData({
    id: adminSession.admin.id,
    role: adminSession.admin.role,
  })

  return NextResponse.json(data)
}
