import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminUsersData } from "@/lib/admin/data"
import { adminUsersFiltersSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const filters = adminUsersFiltersSchema.parse({
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    role: request.nextUrl.searchParams.get("role") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    sort: request.nextUrl.searchParams.get("sort") ?? undefined,
    direction: request.nextUrl.searchParams.get("direction") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
  })

  const data = await getAdminUsersData(filters)

  return NextResponse.json(data)
}
