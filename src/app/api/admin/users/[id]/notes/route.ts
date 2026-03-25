import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { createAdminUserNote } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminUserNoteCreateSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("users:notes:create")
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminUserNoteCreateSchema.parse(body)
    const { id } = await context.params

    const note = await createAdminUserNote({
      actorUserId: adminSession.admin.id,
      targetUserId: id,
      body: data.body,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz not verisi"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
