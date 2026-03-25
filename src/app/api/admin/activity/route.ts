import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminActivityData } from "@/lib/admin/data"
import { adminActivityFiltersSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  const adminSession = await requireAdminApiSession("activity:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const filters = adminActivityFiltersSchema.parse({
    event: request.nextUrl.searchParams.get("event") ?? undefined,
    actor: request.nextUrl.searchParams.get("actor") ?? undefined,
    target: request.nextUrl.searchParams.get("target") ?? undefined,
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined,
    ip: request.nextUrl.searchParams.get("ip") ?? undefined,
    query: request.nextUrl.searchParams.get("query") ?? undefined,
    page: request.nextUrl.searchParams.get("page") ?? undefined,
  })

  const data = await getAdminActivityData(filters)
  return NextResponse.json(data)
}
