import { ActivityLogEvent, Prisma, type ActivityLog, type User } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { formatAdminActivityEvent, formatAdminRole } from "@/lib/admin/labels"
import {
  canViewFullUserDetail,
  canViewMaskedUserDetail,
  hasPermission,
} from "@/lib/admin/permissions"
import { getApprovedRawExportForViewer, getRecentApprovalRequestsForUser } from "@/lib/admin/approvals-data"
import type {
  AdminActivityExplorerItem,
  AdminActivityItem,
  AdminStaffRole,
  AdminTopCategory,
  AdminUserDetail,
} from "@/types/admin"

type ActivityWithUsers = ActivityLog & {
  actorUser: Pick<User, "id" | "name" | "email"> | null
  targetUser: Pick<User, "id" | "name" | "email"> | null
}

function formatDayOffset(offset: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - offset)
  return date
}

function readMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null
  }

  return value as Record<string, unknown>
}

function describeActivity(activity: ActivityWithUsers) {
  const metadata = readMetadata(activity.metadata)
  const actorName = activity.actorUser?.name || activity.actorUser?.email || "Sistem"
  const targetName = activity.targetUser?.name || activity.targetUser?.email || actorName

  switch (activity.event) {
    case "LOGIN":
      return `${actorName} oturum acti`
    case "USER_CREATED":
      return `${targetName} hesabi olusturuldu`
    case "USER_STATUS_CHANGED":
      return `${actorName}, ${targetName} hesabini ${metadata?.nextStatus === "active" ? "aktif" : "pasif"} duruma getirdi`
    case "USER_ROLE_CHANGED":
      return `${actorName}, ${targetName} rolunu ${formatAdminRole(
        typeof metadata?.nextRole === "string" ? (metadata.nextRole as Parameters<typeof formatAdminRole>[0]) : "USER"
      )} olarak degistirdi`
    case "BULK_USER_UPDATED":
      return `${actorName} toplu kullanici islemi uyguladi`
    case "APPROVAL_REQUESTED":
      return `${actorName} kritik islem icin onay istedi`
    case "APPROVAL_APPROVED":
      return `${actorName} onay istegini uyguladi`
    case "APPROVAL_REJECTED":
      return `${actorName} onay istegini reddetti`
    case "USER_NOTE_CREATED":
      return `${actorName} internal not birakti`
    case "USER_SESSIONS_REVOKED":
      return `${actorName} oturumlari kapatti`
    case "RAW_EXPORT_REQUESTED":
      return `${actorName} ham export istedi`
    case "RAW_EXPORT_DOWNLOADED":
      return `${actorName} ham export indirdi`
    default:
      return `${actorName} ${formatAdminActivityEvent(activity.event)} islemi yapti`
  }
}

function serializeActivity(activity: ActivityWithUsers): AdminActivityItem {
  const actorName = activity.actorUser?.name || activity.actorUser?.email || "Sistem"
  const targetName = activity.targetUser?.name || activity.targetUser?.email || actorName

  return {
    id: activity.id,
    event: activity.event,
    createdAt: activity.createdAt.toISOString(),
    actorName,
    targetName,
    description: describeActivity(activity),
    ipAddress: activity.ipAddress,
  }
}

function serializeActivityExplorer(activity: ActivityWithUsers): AdminActivityExplorerItem {
  const actorName = activity.actorUser?.name || activity.actorUser?.email || "Sistem"
  const targetName = activity.targetUser?.name || activity.targetUser?.email || actorName

  return {
    id: activity.id,
    event: activity.event,
    createdAt: activity.createdAt.toISOString(),
    actorName,
    actorEmail: activity.actorUser?.email ?? null,
    targetName,
    targetEmail: activity.targetUser?.email ?? null,
    description: describeActivity(activity),
    ipAddress: activity.ipAddress,
    userAgent: activity.userAgent,
    metadata: readMetadata(activity.metadata),
  }
}

export async function getAdminUserDetailData(input: {
  userId: string
  viewer: {
    id: string
    role: AdminStaffRole
  }
}): Promise<AdminUserDetail | null> {
  if (!canViewMaskedUserDetail(input.viewer.role)) {
    return null
  }

  const sensitiveDataVisible = canViewFullUserDetail(input.viewer.role)
  const window30 = formatDayOffset(29)
  const window90 = formatDayOffset(89)

  const [
    user,
    totalsByType,
    goalCount,
    categoryCount,
    recentTransactions,
    groupedCategories,
    recentActivity,
    recentAdminChanges,
    window30Aggregate,
    window90Aggregate,
    window30ByType,
    window90ByType,
    loginHistory,
    notes,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sessionVersion: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId: input.userId },
      _sum: { amount: true },
    }),
    prisma.goal.count({
      where: { userId: input.userId },
    }),
    prisma.category.count({
      where: { userId: input.userId },
    }),
    prisma.transaction.findMany({
      where: { userId: input.userId },
      take: 10,
      orderBy: { date: "desc" },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: input.userId,
        type: "EXPENSE",
        categoryId: { not: null },
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),
    prisma.activityLog.findMany({
      where: {
        OR: [{ actorUserId: input.userId }, { targetUserId: input.userId }],
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.activityLog.findMany({
      where: {
        targetUserId: input.userId,
        event: {
          in: [
            ActivityLogEvent.USER_STATUS_CHANGED,
            ActivityLogEvent.USER_ROLE_CHANGED,
            ActivityLogEvent.BULK_USER_UPDATED,
            ActivityLogEvent.APPROVAL_REQUESTED,
            ActivityLogEvent.APPROVAL_APPROVED,
            ActivityLogEvent.APPROVAL_REJECTED,
            ActivityLogEvent.USER_SESSIONS_REVOKED,
            ActivityLogEvent.RAW_EXPORT_REQUESTED,
            ActivityLogEvent.RAW_EXPORT_DOWNLOADED,
            ActivityLogEvent.USER_NOTE_CREATED,
          ],
        },
      },
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: input.userId,
        date: {
          gte: window30,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: input.userId,
        date: {
          gte: window90,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId: input.userId,
        date: {
          gte: window30,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId: input.userId,
        date: {
          gte: window90,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.activityLog.findMany({
      where: {
        actorUserId: input.userId,
        event: "LOGIN",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.adminUserNote.findMany({
      where: { userId: input.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        authorUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ])

  if (!user) {
    return null
  }

  const categoryIds = groupedCategories
    .map((item) => item.categoryId)
    .filter((item): item is string => Boolean(item))

  const [categories, recentApprovalRequests, approvedRawExport] = await Promise.all([
    categoryIds.length
      ? prisma.category.findMany({
          where: {
            id: {
              in: categoryIds,
            },
          },
          select: {
            id: true,
            name: true,
            parent: {
              select: {
                name: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    getRecentApprovalRequestsForUser(input.userId, input.viewer),
    hasPermission(input.viewer.role, "users:raw-export:request")
      ? getApprovedRawExportForViewer(input.userId, input.viewer)
      : Promise.resolve(null),
  ])

  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const topCategories: AdminTopCategory[] = groupedCategories
    .map((item) => {
      if (!item.categoryId) {
        return null
      }

      const category = categoryMap.get(item.categoryId)
      if (!category) {
        return null
      }

      return {
        id: item.categoryId,
        name: category.name,
        parentName: category.parent?.name ?? null,
        totalAmount: sensitiveDataVisible ? item._sum.amount ?? 0 : null,
        transactionCount: item._count._all,
      }
    })
    .filter((item): item is AdminTopCategory => Boolean(item))
    .sort((left, right) => right.transactionCount - left.transactionCount)
    .slice(0, 5)

  const income = totalsByType.find((item) => item.type === "INCOME")?._sum.amount ?? 0
  const expense = totalsByType.find((item) => item.type === "EXPENSE")?._sum.amount ?? 0
  const income30 = window30ByType.find((item) => item.type === "INCOME")?._sum.amount ?? 0
  const expense30 = window30ByType.find((item) => item.type === "EXPENSE")?._sum.amount ?? 0
  const income90 = window90ByType.find((item) => item.type === "INCOME")?._sum.amount ?? 0
  const expense90 = window90ByType.find((item) => item.type === "EXPENSE")?._sum.amount ?? 0

  const deviceMap = new Map<string, { ipAddress: string | null; userAgent: string | null; lastSeenAt: string; loginCount: number }>()
  for (const item of loginHistory) {
    const key = `${item.ipAddress ?? "-"}::${item.userAgent ?? "-"}`
    const existing = deviceMap.get(key)
    if (existing) {
      existing.loginCount += 1
      continue
    }

    deviceMap.set(key, {
      ipAddress: item.ipAddress,
      userAgent: item.userAgent,
      lastSeenAt: item.createdAt.toISOString(),
      loginCount: 1,
    })
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      sessionVersion: user.sessionVersion,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    },
    sensitiveDataVisible,
    canCreateNotes: hasPermission(input.viewer.role, "users:notes:create"),
    canRequestUserOps: hasPermission(input.viewer.role, "users:request:user-ops"),
    canManageStaffRoles: hasPermission(input.viewer.role, "users:manage:staff"),
    canRevokeSessions: hasPermission(input.viewer.role, "users:sessions:revoke"),
    canRequestRawExport: hasPermission(input.viewer.role, "users:raw-export:request"),
    stats: {
      totalTransactions: user._count.transactions,
      totalIncome: sensitiveDataVisible ? income : null,
      totalExpense: sensitiveDataVisible ? expense : null,
      goalCount,
      categoryCount,
    },
    windows: [
      {
        days: 30,
        transactionCount: window30Aggregate._count._all,
        totalIncome: sensitiveDataVisible ? income30 : null,
        totalExpense: sensitiveDataVisible ? expense30 : null,
      },
      {
        days: 90,
        transactionCount: window90Aggregate._count._all,
        totalIncome: sensitiveDataVisible ? income90 : null,
        totalExpense: sensitiveDataVisible ? expense90 : null,
      },
    ],
    recentTransactions: recentTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: sensitiveDataVisible ? transaction.amount : null,
      description: transaction.description,
      date: transaction.date.toISOString(),
      categoryName: transaction.category?.name ?? null,
    })),
    topCategories,
    recentActivity: recentActivity.map(serializeActivity),
    recentAdminChanges: recentAdminChanges.map(serializeActivityExplorer),
    recentDevices: Array.from(deviceMap.values()).slice(0, 6),
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      authorName: note.authorUser?.name || note.authorUser?.email || "Sistem",
      authorEmail: note.authorUser?.email ?? null,
    })),
    recentApprovalRequests,
    approvedRawExport: approvedRawExport,
  }
}
