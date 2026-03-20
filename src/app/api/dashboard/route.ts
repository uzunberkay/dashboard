import { NextRequest, NextResponse } from "next/server"
import { getDashboardData } from "@/lib/dashboard-data"
import { getAuthSession, unauthorized } from "@/lib/get-session"

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const monthParam = req.nextUrl.searchParams.get("month")
  const data = await getDashboardData({
    userId: session.user.id,
    monthParam,
  })

  return NextResponse.json(data)
}
