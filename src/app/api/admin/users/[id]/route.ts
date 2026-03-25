import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { getAdminUserDetailData } from "@/lib/admin/user-detail"
import { requestManagedUserUpdate } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminUserUpdateSchema } from "@/lib/validations"

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("users:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params
  const data = await getAdminUserDetailData({
    userId: id,
    viewer: {
      id: adminSession.admin.id,
      role: adminSession.admin.role,
    },
  })

  if (!data) {
    return NextResponse.json({ error: "Kullanici bulunamadi veya detay yetkiniz yok" }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const adminSession = await requireAdminApiSession("users:view")
  if ("response" in adminSession) {
    return adminSession.response
  }

  const { id } = await context.params

  try {
    const body = await request.json()
    const data = adminUserUpdateSchema.parse(body)

    const result = await requestManagedUserUpdate({
      actor: {
        id: adminSession.admin.id,
        role: adminSession.admin.role,
      },
      targetUserId: id,
      role: data.role,
      isActive: data.isActive,
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
            : result.code === "last_super_admin"
              ? 409
              : 400
      return NextResponse.json({ error: result.message }, { status })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
