import { NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminSystemHealthData } from "@/lib/admin/system-data"

export async function GET() {
  const adminSession = await requireAdminApiSession("system:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const data = await getAdminSystemHealthData()
  return NextResponse.json(data)
}
