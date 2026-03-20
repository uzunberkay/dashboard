import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminDashboardData } from "@/lib/admin/data"
import { adminDashboardFiltersSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const filters = adminDashboardFiltersSchema.parse({
    range: request.nextUrl.searchParams.get("range") ?? undefined,
    segment: request.nextUrl.searchParams.get("segment") ?? undefined,
  })

  const data = await getAdminDashboardData(filters)
  return NextResponse.json(data)
}
