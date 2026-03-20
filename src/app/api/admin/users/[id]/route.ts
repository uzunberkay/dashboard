import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminUserDetailData } from "@/lib/admin/data"
import { updateManagedUser } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminUserUpdateSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params
  const data = await getAdminUserDetailData(id)

  if (!data) {
    return NextResponse.json({ error: "Kullanici bulunamadi" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const data = adminUserUpdateSchema.parse(body)

    const result = await updateManagedUser({
      actorUserId: adminSession.admin.id,
      targetUserId: id,
      role: data.role,
      isActive: data.isActive,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    })

    if (!result.ok) {
      const status =
        result.code === "not_found" ? 404 : result.code === "self_protected" ? 400 : 409
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json(result.user)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
