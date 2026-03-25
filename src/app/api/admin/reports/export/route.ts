import { NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminAggregateExportData } from "@/lib/admin/reports-data"

export async function GET() {
  const adminSession = await requireAdminApiSession("reports:export:aggregate")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const data = await getAdminAggregateExportData()

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-aggregate-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
