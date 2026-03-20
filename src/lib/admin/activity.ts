import { ActivityLogEvent, type Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

type CreateActivityLogInput = {
  event: ActivityLogEvent
  actorUserId?: string | null
  targetUserId?: string | null
  metadata?: Prisma.InputJsonValue
  ipAddress?: string | null
  userAgent?: string | null
}

export async function createActivityLog({
  event,
  actorUserId,
  targetUserId,
  metadata,
  ipAddress,
  userAgent,
}: CreateActivityLogInput) {
  try {
    await prisma.activityLog.create({
      data: {
        event,
        actorUserId: actorUserId ?? null,
        targetUserId: targetUserId ?? null,
        metadata,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    })
  } catch (error) {
    logger.error("Activity log write failed", error, {
      event,
      actorUserId: actorUserId ?? undefined,
      targetUserId: targetUserId ?? undefined,
    })
  }
}
