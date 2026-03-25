import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import {
  downloadApprovedRawUserExport,
  requestRawUserExport,
} from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminRawExportRequestSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("users:raw-export:request")
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminRawExportRequestSchema.parse(body)
    const { id } = await context.params

    const result = await requestRawUserExport({
      actor: {
        id: adminSession.admin.id,
        role: adminSession.admin.role,
      },
      targetUserId: id,
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
            : 400
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz export istegi"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const adminSession = await requireAdminApiSession("users:raw-export:request")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const requestId = request.nextUrl.searchParams.get("requestId")
  const token = request.nextUrl.searchParams.get("token")

  if (!requestId || !token) {
    return NextResponse.json({ error: "Eksik export baglantisi" }, { status: 400 })
  }

  const result = await downloadApprovedRawUserExport({
    actorUserId: adminSession.admin.id,
    requestId,
    token,
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  })

  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "download_unavailable"
          ? 410
          : 400
    return NextResponse.json({ error: result.message }, { status })
  }

  if (!("content" in result) || !("filename" in result)) {
    return NextResponse.json({ error: result.message ?? "Ham export hazir degil" }, { status: 409 })
  }

  return new NextResponse(JSON.stringify(result.content, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  })
}
