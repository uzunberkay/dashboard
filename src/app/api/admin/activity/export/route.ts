import { NextRequest, NextResponse } from "next/server"
import { ActivityLogEvent } from "@prisma/client"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { createActivityLog } from "@/lib/admin/activity"
import { getAdminActivityExportRows } from "@/lib/admin/data"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminActivityFiltersSchema } from "@/lib/validations"

function escapeCsvCell(value: string | number | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value)
  if (raw.includes(",") || raw.includes("\"") || raw.includes("\n")) {
    return `"${raw.replace(/"/g, "\"\"")}"`
  }

  return raw
}

export async function GET(request: NextRequest) {
  const adminSession = await requireAdminApiSession("reports:export:activity")
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
  })

  const { items, limit } = await getAdminActivityExportRows(filters)

  await createActivityLog({
    event: ActivityLogEvent.ADMIN_EXPORT_CREATED,
    actorUserId: adminSession.admin.id,
    metadata: {
      filters,
      limit,
      exportedRows: items.length,
    },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  })

  const header = [
    "createdAt",
    "event",
    "actorName",
    "actorEmail",
    "targetName",
    "targetEmail",
    "description",
    "ipAddress",
    "userAgent",
  ]

  const lines = items.map((item) =>
    [
      item.createdAt,
      item.event,
      item.actorName,
      item.actorEmail,
      item.targetName,
      item.targetEmail,
      item.description,
      item.ipAddress,
      item.userAgent,
    ]
      .map(escapeCsvCell)
      .join(",")
  )

  const csv = [header.join(","), ...lines].join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="admin-activity-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
