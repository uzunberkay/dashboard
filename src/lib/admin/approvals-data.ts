import { Prisma, type AdminApprovalRequest, type User } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hasPermission, isStaffRole } from "@/lib/admin/permissions"
import type {
  AdminApprovalQueueData,
  AdminApprovalRequestSummary,
  AdminStaffRole,
  AdminUserRole,
} from "@/types/admin"
import { formatAdminRole } from "@/lib/admin/labels"

type ApprovalWithUsers = AdminApprovalRequest & {
  targetUser: Pick<User, "id" | "name" | "email" | "role"> | null
  requestedByUser: Pick<User, "id" | "name" | "email" | "role">
  approvedByUser: Pick<User, "id" | "name" | "email" | "role"> | null
}

type ViewerContext = {
  id: string
  role: AdminStaffRole
}

function asJsonObject(value: Prisma.JsonValue) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {}
  }

  return value as Record<string, unknown>
}

function isSensitiveApproval(request: Pick<ApprovalWithUsers, "actionType" | "payloadJson">) {
  if (request.actionType === "ADMIN_SETTINGS_UPDATE" || request.actionType === "RAW_USER_EXPORT") {
    return true
  }

  if (request.actionType === "BULK_USER_ACCOUNT_UPDATE") {
    return false
  }

  const payload = asJsonObject(request.payloadJson)
  const currentRole = payload.currentRole
  const nextRole = payload.nextRole

  if (typeof currentRole !== "string" || typeof nextRole !== "string") {
    return true
  }

  return isStaffRole(currentRole as AdminUserRole) || isStaffRole(nextRole as AdminUserRole)
}

function buildSummaryLines(request: Pick<ApprovalWithUsers, "actionType" | "payloadJson">) {
  const payload = asJsonObject(request.payloadJson)

  switch (request.actionType) {
    case "USER_ACCOUNT_UPDATE": {
      const lines: string[] = []

      if (typeof payload.currentRole === "string" && typeof payload.nextRole === "string" && payload.currentRole !== payload.nextRole) {
        lines.push(`Rol: ${formatAdminRole(payload.currentRole as AdminUserRole)} -> ${formatAdminRole(payload.nextRole as AdminUserRole)}`)
      }

      if (typeof payload.currentIsActive === "boolean" && typeof payload.nextIsActive === "boolean" && payload.currentIsActive !== payload.nextIsActive) {
        lines.push(`Durum: ${payload.currentIsActive ? "Aktif" : "Pasif"} -> ${payload.nextIsActive ? "Aktif" : "Pasif"}`)
      }

      return lines.length > 0 ? lines : ["Kullanici ayarlarinda degisiklik"]
    }
    case "BULK_USER_ACCOUNT_UPDATE":
      return [
        `Toplu islem: ${payload.action === "enable" ? "Aktif et" : "Pasif yap"}`,
        `Hedef sayisi: ${Array.isArray(payload.userIds) ? payload.userIds.length : 0}`,
      ]
    case "ADMIN_SETTINGS_UPDATE":
      return [
        `Guncellenen ayar sayisi: ${payload.values && typeof payload.values === "object" ? Object.keys(payload.values).length : 0}`,
      ]
    case "RAW_USER_EXPORT":
      return ["Ham kullanici exportu olusturulacak"]
    default:
      return ["Onay ozeti mevcut degil"]
  }
}

function buildDownloadUrl(request: ApprovalWithUsers, viewerId: string) {
  if (
    request.actionType !== "RAW_USER_EXPORT" ||
    request.status !== "APPROVED" ||
    request.requestedByUserId !== viewerId ||
    !request.targetUserId ||
    !request.fulfillmentToken ||
    !request.fulfillmentExpiresAt ||
    request.fulfilledAt
  ) {
    return null
  }

  return {
    url: `/api/admin/users/${request.targetUserId}/export?requestId=${request.id}&token=${request.fulfillmentToken}`,
    expiresAt: request.fulfillmentExpiresAt.toISOString(),
  }
}

export function serializeApprovalRequestSummary(request: ApprovalWithUsers, viewer?: ViewerContext): AdminApprovalRequestSummary {
  const sensitive = isSensitiveApproval(request)
  const canApprove =
    viewer !== undefined &&
    request.status === "PENDING" &&
    request.requestedByUserId !== viewer.id &&
    (sensitive
      ? hasPermission(viewer.role, "approvals:approve:sensitive")
      : hasPermission(viewer.role, "approvals:approve:user-ops"))

  return {
    id: request.id,
    actionType: request.actionType,
    status: request.status,
    createdAt: request.createdAt.toISOString(),
    expiresAt: request.expiresAt.toISOString(),
    decidedAt: request.decidedAt?.toISOString() ?? null,
    reason: request.reason ?? null,
    rejectionReason: request.rejectionReason ?? null,
    targetUser: request.targetUser
      ? {
          id: request.targetUser.id,
          name: request.targetUser.name,
          email: request.targetUser.email,
          role: request.targetUser.role,
        }
      : null,
    requestedBy: {
      id: request.requestedByUser.id,
      name: request.requestedByUser.name,
      email: request.requestedByUser.email,
      role: request.requestedByUser.role,
    },
    approvedBy: request.approvedByUser
      ? {
          id: request.approvedByUser.id,
          name: request.approvedByUser.name,
          email: request.approvedByUser.email,
          role: request.approvedByUser.role,
        }
      : null,
    summaryLines: buildSummaryLines(request),
    isSensitive: sensitive,
    canApprove,
    canReject: canApprove,
    availableDownload: viewer ? buildDownloadUrl(request, viewer.id) : null,
  }
}

export async function expireAdminApprovalRequests() {
  await prisma.adminApprovalRequest.updateMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: "EXPIRED",
      decidedAt: new Date(),
    },
  })
}

export async function getAdminApprovalQueueData(viewer: ViewerContext): Promise<AdminApprovalQueueData> {
  await expireAdminApprovalRequests()

  const [pending, recent] = await Promise.all([
    prisma.adminApprovalRequest.findMany({
      where: { status: "PENDING" },
      orderBy: [{ createdAt: "desc" }],
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      take: 20,
    }),
    prisma.adminApprovalRequest.findMany({
      where: {
        status: {
          in: ["APPROVED", "REJECTED", "EXPIRED"],
        },
      },
      orderBy: [{ decidedAt: "desc" }, { createdAt: "desc" }],
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        requestedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      take: 20,
    }),
  ])

  return {
    pending: pending.map((item) => serializeApprovalRequestSummary(item as ApprovalWithUsers, viewer)),
    recent: recent.map((item) => serializeApprovalRequestSummary(item as ApprovalWithUsers, viewer)),
  }
}

export async function getRecentApprovalRequestsForUser(userId: string, viewer: ViewerContext) {
  await expireAdminApprovalRequests()

  const items = await prisma.adminApprovalRequest.findMany({
    where: { targetUserId: userId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      requestedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      approvedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    take: 8,
  })

  return items.map((item) => serializeApprovalRequestSummary(item as ApprovalWithUsers, viewer))
}

export async function getApprovedRawExportForViewer(targetUserId: string, viewer: ViewerContext) {
  const request = await prisma.adminApprovalRequest.findFirst({
    where: {
      actionType: "RAW_USER_EXPORT",
      status: "APPROVED",
      targetUserId,
      requestedByUserId: viewer.id,
      fulfillmentExpiresAt: {
        gt: new Date(),
      },
      fulfilledAt: null,
    },
    orderBy: {
      decidedAt: "desc",
    },
    include: {
      targetUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      requestedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      approvedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  if (!request) {
    return null
  }

  return serializeApprovalRequestSummary(request as ApprovalWithUsers, viewer).availableDownload
}
