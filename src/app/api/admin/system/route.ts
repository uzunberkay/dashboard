import { NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminSystemData } from "@/lib/admin/data"

export async function GET() {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const data = await getAdminSystemData()
  return NextResponse.json(data)
}
