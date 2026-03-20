import { NextRequest, NextResponse } from "next/server"
import { requireAdminApiSession } from "@/lib/admin/auth"
import { createBulkUserUpdateActivity, revalidateAdminState, updateManagedUser } from "@/lib/admin/mutations"
import { getClientIp, getUserAgent } from "@/lib/request"
import { adminBulkActionSchema } from "@/lib/validations"

const BULK_ACTION_TO_UPDATE = {
  enable: { isActive: true },
  disable: { isActive: false },
  promoteAdmin: { role: "ADMIN" as const },
  demoteUser: { role: "USER" as const },
}

export async function POST(request: NextRequest) {
  const adminSession = await requireAdminApiSession()
  if ("response" in adminSession) {
    return adminSession.response
  }

  try {
    const body = await request.json()
    const data = adminBulkActionSchema.parse(body)
    const mutation = BULK_ACTION_TO_UPDATE[data.action]
    const ipAddress = getClientIp(request)
    const userAgent = getUserAgent(request)

    const results = await Promise.all(
      data.userIds.map((userId) =>
        updateManagedUser({
          actorUserId: adminSession.admin.id,
          targetUserId: userId,
          role: "role" in mutation ? mutation.role : undefined,
          isActive: "isActive" in mutation ? mutation.isActive : undefined,
          ipAddress,
          userAgent,
          skipRevalidate: true,
        })
      )
    )

    revalidateAdminState()

    const updated = results.filter((result) => result.ok).length
    const skipped = results
      .filter((result) => !result.ok)
      .map((result) => ("message" in result ? result.message : "Islem atlandi"))

    await createBulkUserUpdateActivity({
      actorUserId: adminSession.admin.id,
      action: data.action,
      userIds: data.userIds,
      updatedCount: updated,
      skipped,
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      updated,
      skipped,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
