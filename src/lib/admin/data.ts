import {
  AdminSavedViewScope,
  Prisma,
  type ActivityLog,
  type AdminSavedView,
  type AdminSetting,
  type User,
} from "@prisma/client"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { prisma } from "@/lib/prisma"
import { buildAdminSavedViewHref } from "@/lib/admin/query"
import { getOrSetAdminRuntimeCache } from "@/lib/admin/runtime-cache"
import {
  ADMIN_SETTING_DEFINITIONS,
  ADMIN_SETTING_DEFAULTS,
  mergeAdminSettingValues,
} from "@/lib/admin/settings"
import { formatAdminActivityEvent, formatAdminRole } from "@/lib/admin/labels"
import { canAccessSavedViewScope } from "@/lib/admin/permissions"
import type {
  AdminAnomalyCard,
  AdminActivityExplorerItem,
  AdminActivityFilters,
  AdminActivityItem,
  AdminActivityResponse,
  AdminDashboardData,
  AdminDashboardFilters,
  AdminReportsData,
  AdminSavedViewSummary,
  AdminSettingValueMap,
  AdminStaffRole,
  AdminSystemData,
  AdminTopCategory,
  AdminUserDetail,
  AdminUsersFilters,
  AdminUsersResponse,
} from "@/types/admin"

export const ADMIN_USERS_PAGE_SIZE = 10
export const ADMIN_ACTIVITY_PAGE_SIZE = 20

type ActivityWithUsers = ActivityLog & {
  actorUser: Pick<User, "id" | "name" | "email"> | null
  targetUser: Pick<User, "id" | "name" | "email"> | null
}

type SavedViewWithUser = AdminSavedView & {
  createdByUser: Pick<User, "name" | "email"> | null
}

type SettingRow = Pick<AdminSetting, "key" | "valueJson">

const DASHBOARD_RANGE_TO_DAYS: Record<AdminDashboardFilters["range"], number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
}

function formatDayOffset(offset: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - offset)
  return date
}

function toDateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function readMetadata(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null
  }

  return value as Record<string, unknown>
}

function readFilters(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) =>
      typeof item === "string" && item.length > 0 ? [[key, item]] : []
    )
  )
}

function roundNumber(value: number, fractionDigits = 1) {
  const multiplier = 10 ** fractionDigits
  return Math.round(value * multiplier) / multiplier
}

function buildDashboardUserWhere(segment: AdminDashboardFilters["segment"]): Prisma.UserWhereInput {
  switch (segment) {
    case "active":
      return { isActive: true }
    case "inactive":
      return { isActive: false }
    case "staff":
      return {
        role: {
          not: "USER",
        },
      }
    default:
      return {}
  }
}

function buildUserSegmentSql(segment: AdminDashboardFilters["segment"], alias: string) {
  switch (segment) {
    case "active":
      return Prisma.raw(`AND "${alias}"."isActive" = true`)
    case "inactive":
      return Prisma.raw(`AND "${alias}"."isActive" = false`)
    case "staff":
      return Prisma.raw(`AND "${alias}"."role" <> 'USER'`)
    default:
      return Prisma.empty
  }
}

function getDateRangeFromFilter(range: AdminDashboardFilters["range"]) {
  return formatDayOffset(DASHBOARD_RANGE_TO_DAYS[range] - 1)
}

function describeActivity(activity: ActivityWithUsers, options?: { anonymize?: boolean }) {
  const metadata = readMetadata(activity.metadata)
  const anonymize = options?.anonymize ?? false
  const actorName = anonymize
    ? "Bir admin"
    : activity.actorUser?.name || activity.actorUser?.email || "Sistem"
  const targetName = anonymize
    ? "bir hesap"
    : activity.targetUser?.name || activity.targetUser?.email || actorName

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
      return `${actorName} toplu kullanici islemi baslatti`
    case "ADMIN_SETTINGS_UPDATED":
      return `${actorName} admin politika ayarlarini guncelledi`
    case "ADMIN_EXPORT_CREATED":
      return `${actorName} aktivite export'u olusturdu`
    case "SAVED_VIEW_CREATED":
      return `${actorName} kayitli gorunum olusturdu`
    case "SAVED_VIEW_UPDATED":
      return `${actorName} kayitli gorunumu guncelledi`
    case "SAVED_VIEW_DELETED":
      return `${actorName} kayitli gorunumu sildi`
    case "APPROVAL_REQUESTED":
      return `${actorName} kritik bir islem icin onay istedi`
    case "APPROVAL_APPROVED":
      return `${actorName} bekleyen onay istegini uyguladi`
    case "APPROVAL_REJECTED":
      return `${actorName} bekleyen onay istegini reddetti`
    case "USER_NOTE_CREATED":
      return `${actorName}, ${targetName} icin internal not birakti`
    case "USER_SESSIONS_REVOKED":
      return `${actorName}, ${targetName} oturumlarini gecersiz kilidi`
    case "RAW_EXPORT_REQUESTED":
      return `${actorName}, ${targetName} icin ham export istedi`
    case "RAW_EXPORT_DOWNLOADED":
      return `${actorName}, ${targetName} ham exportunu indirdi`
    case "FINANCE_REMINDER_JOB_SUCCEEDED":
      return `${actorName} finance reminder job'unu basariyla calistirdi`
    case "FINANCE_REMINDER_JOB_FAILED":
      return `${actorName} finance reminder job'unda hata aldi`
    default:
      return `${actorName} ${formatAdminActivityEvent(activity.event)} islemi yapti`
  }
}

function serializeActivity(activity: ActivityWithUsers, options?: { anonymize?: boolean }): AdminActivityItem {
  const anonymize = options?.anonymize ?? false
  const actorName = anonymize
    ? "Maskeli actor"
    : activity.actorUser?.name || activity.actorUser?.email || "Sistem"
  const targetName = anonymize
    ? "Maskeli target"
    : activity.targetUser?.name || activity.targetUser?.email || actorName

  return {
    id: activity.id,
    event: activity.event,
    createdAt: activity.createdAt.toISOString(),
    actorName,
    targetName,
    description: describeActivity(activity, { anonymize }),
    ipAddress: anonymize ? null : activity.ipAddress,
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

function serializeSavedView(view: SavedViewWithUser): AdminSavedViewSummary {
  const filters = readFilters(view.filtersJson)

  return {
    id: view.id,
    scope: view.scope,
    name: view.name,
    isDefault: view.isDefault,
    filters,
    href: buildAdminSavedViewHref(view.scope, filters),
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    createdByName: view.createdByUser?.name || view.createdByUser?.email || "Sistem",
    createdByEmail: view.createdByUser?.email ?? null,
  }
}

async function getAdminSettingRows() {
  const rows = await prisma.adminSetting.findMany({
    select: {
      key: true,
      valueJson: true,
    },
  })

  return rows as SettingRow[]
}

export async function getAdminSettingValues() {
  return mergeAdminSettingValues(await getAdminSettingRows())
}

async function measureDbResponseTimeMs() {
  const startedAt = performance.now()
  await prisma.$queryRaw`SELECT 1`
  return Math.round((performance.now() - startedAt) * 100) / 100
}

function buildDashboardCacheKey(filters: AdminDashboardFilters) {
  return `${CACHE_TAGS.adminDashboard}:${filters.range}:${filters.segment}`
}

export async function getAdminDashboardData(
  filters: AdminDashboardFilters,
  viewerRole?: AdminStaffRole
): Promise<AdminDashboardData> {
  const settings = await getAdminSettingValues()
  const anonymizeActivity = viewerRole === "ANALYST"

  return getOrSetAdminRuntimeCache(buildDashboardCacheKey(filters), settings.dashboardCacheTtlSec, async () => {
    const rangeStart = getDateRangeFromFilter(filters.range)
    const userWhere = buildDashboardUserWhere(filters.segment)
    const userRelation = Object.keys(userWhere).length > 0 ? { is: userWhere } : undefined
    const userSqlCondition = buildUserSegmentSql(filters.segment, "u")

    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalTransactions,
      goalUsers,
      transactionTrendRows,
      loginTrendRows,
      newUserTrendRows,
      recentActivity,
      topCategories,
      dbResponseTimeMs,
    ] = await Promise.all([
      prisma.user.count({ where: userWhere }),
      prisma.user.count({
        where: {
          ...userWhere,
          lastLoginAt: {
            gte: rangeStart,
          },
        },
      }),
      prisma.user.count({
        where: {
          ...userWhere,
          createdAt: {
            gte: rangeStart,
          },
        },
      }),
      prisma.transaction.count({
        where: {
          date: {
            gte: rangeStart,
          },
          ...(userRelation ? { user: userRelation } : {}),
        },
      }),
      prisma.goal.findMany({
        where: {
          ...(userRelation ? { user: userRelation } : {}),
        },
        distinct: ["userId"],
        select: {
          userId: true,
        },
      }),
      prisma.$queryRaw<Array<{ day: string; total: number }>>(Prisma.sql`
        SELECT TO_CHAR(DATE(t."date"), 'YYYY-MM-DD') AS "day", COUNT(*)::int AS "total"
        FROM "Transaction" t
        INNER JOIN "User" u ON u."id" = t."userId"
        WHERE t."date" >= ${rangeStart}
        ${userSqlCondition}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.$queryRaw<Array<{ day: string; total: number }>>(Prisma.sql`
        SELECT TO_CHAR(DATE(a."createdAt"), 'YYYY-MM-DD') AS "day", COUNT(*)::int AS "total"
        FROM "ActivityLog" a
        INNER JOIN "User" u ON u."id" = a."actorUserId"
        WHERE a."event" = 'LOGIN'
        AND a."createdAt" >= ${rangeStart}
        ${userSqlCondition}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.$queryRaw<Array<{ day: string; total: number }>>(Prisma.sql`
        SELECT TO_CHAR(DATE(u."createdAt"), 'YYYY-MM-DD') AS "day", COUNT(*)::int AS "total"
        FROM "User" u
        WHERE u."createdAt" >= ${rangeStart}
        ${userSqlCondition}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
      prisma.activityLog.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        where: {
          createdAt: {
            gte: rangeStart,
          },
        },
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
      prisma.$queryRaw<Array<AdminTopCategory>>(Prisma.sql`
        SELECT
          c."id" AS "id",
          c."name" AS "name",
          parent."name" AS "parentName",
          COALESCE(SUM(t."amount"), 0)::float AS "totalAmount",
          COUNT(*)::int AS "transactionCount"
        FROM "Transaction" t
        INNER JOIN "User" u ON u."id" = t."userId"
        INNER JOIN "Category" c ON c."id" = t."categoryId"
        LEFT JOIN "Category" parent ON parent."id" = c."parentId"
        WHERE t."date" >= ${rangeStart}
        AND t."type" = 'EXPENSE'
        AND t."categoryId" IS NOT NULL
        ${userSqlCondition}
        GROUP BY c."id", c."name", parent."name"
        ORDER BY "totalAmount" DESC, "transactionCount" DESC
        LIMIT 5
      `),
      measureDbResponseTimeMs(),
    ])

    const transactionTrend = new Map(transactionTrendRows.map((item) => [item.day, item.total]))
    const loginTrend = new Map(loginTrendRows.map((item) => [item.day, item.total]))
    const newUserTrend = new Map(newUserTrendRows.map((item) => [item.day, item.total]))
    const trendDays = DASHBOARD_RANGE_TO_DAYS[filters.range]
    const trend = Array.from({ length: trendDays }, (_, index) => {
      const day = new Date(rangeStart)
      day.setDate(rangeStart.getDate() + index)
      const key = toDateKey(day)

      return {
        date: key,
        transactions: transactionTrend.get(key) ?? 0,
        logins: loginTrend.get(key) ?? 0,
        newUsers: newUserTrend.get(key) ?? 0,
      }
    })

    const goalUsageRate = totalUsers > 0 ? roundNumber((goalUsers.length / totalUsers) * 100, 1) : 0
    const transactionsPerActiveUser = activeUsers > 0 ? roundNumber(totalTransactions / activeUsers, 2) : 0

    const anomalies: AdminAnomalyCard[] = [
      {
        id: "db-response",
        severity: dbResponseTimeMs > settings.dbDegradedThresholdMs ? "warning" : "info",
        title: "DB yanit egrisi",
        description:
          dbResponseTimeMs > settings.dbDegradedThresholdMs
            ? "Veritabani yaniti tanimli esigin ustune cikti."
            : "Veritabani yaniti tanimli esik icinde ilerliyor.",
        value: `${dbResponseTimeMs}ms`,
      },
      {
        id: "goal-coverage",
        severity: goalUsageRate < 35 && totalUsers >= 5 ? "warning" : "info",
        title: "Hedef kapsama alani",
        description:
          goalUsageRate < 35 && totalUsers >= 5
            ? "Hedef kullanan hesap orani dusuk. Onboarding veya urun benimsemesini izleyin."
            : "Hedef kullanim orani beklenen sinirlar icinde.",
        value: `%${goalUsageRate}`,
      },
      {
        id: "activity-density",
        severity: totalTransactions === 0 && totalUsers > 0 ? "warning" : "info",
        title: "Aktivite yogunlugu",
        description:
          totalTransactions === 0 && totalUsers > 0
            ? "Secili aralikta finansal hareket gorunmuyor."
            : "Aktif kullanici basina islem ritmi izleniyor.",
        value: activeUsers > 0 ? `${transactionsPerActiveUser}` : "0",
      },
    ]

    return {
      filters,
      summary: {
        totalUsers,
        activeUsers,
        newUsers,
        totalTransactions,
        goalUsageRate,
        transactionsPerActiveUser,
      },
      trend,
      topCategories,
      anomalies,
      recentActivity: recentActivity.map((item) => serializeActivity(item, { anonymize: anonymizeActivity })),
    }
  })
}

export async function getAdminUsersData(filters: AdminUsersFilters & { page: number }): Promise<AdminUsersResponse> {
  const safePage = Math.max(filters.page, 1)
  const where: Prisma.UserWhereInput = {}

  if (filters.query.trim()) {
    where.OR = [
      {
        email: {
          contains: filters.query.trim(),
          mode: "insensitive",
        },
      },
      {
        name: {
          contains: filters.query.trim(),
          mode: "insensitive",
        },
      },
    ]
  }

  if (filters.role === "staff") {
    where.role = {
      not: "USER",
    }
  } else if (filters.role !== "all") {
    where.role = filters.role
  }

  if (filters.status === "active") {
    where.isActive = true
  } else if (filters.status === "inactive") {
    where.isActive = false
  }

  const orderBy =
    filters.sort === "transactionCount"
      ? [
          {
            transactions: {
              _count: filters.direction,
            },
          },
        ]
      : [
          {
            [filters.sort]: filters.direction,
          } satisfies Prisma.UserOrderByWithRelationInput,
        ]

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip: (safePage - 1) * ADMIN_USERS_PAGE_SIZE,
      take: ADMIN_USERS_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE))

  return {
    items: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      transactionCount: user._count.transactions,
    })),
    pagination: {
      page: safePage,
      limit: ADMIN_USERS_PAGE_SIZE,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
    filters,
  }
}

export async function getAdminUserDetailData(userId: string): Promise<AdminUserDetail | null> {
  const { getAdminUserDetailData: getRoleAwareAdminUserDetailData } = await import("@/lib/admin/user-detail")

  return getRoleAwareAdminUserDetailData({
    userId,
    viewer: {
      id: "system",
      role: "SUPER_ADMIN",
    },
  })
}

function buildActivityWhere(filters: AdminActivityFilters): Prisma.ActivityLogWhereInput {
  const conditions: Prisma.ActivityLogWhereInput[] = []

  if (filters.event !== "all") {
    conditions.push({ event: filters.event })
  }

  if (filters.actor.trim()) {
    conditions.push({
      OR: [
        {
          actorUser: {
            is: {
              email: {
                contains: filters.actor.trim(),
                mode: "insensitive",
              },
            },
          },
        },
        {
          actorUser: {
            is: {
              name: {
                contains: filters.actor.trim(),
                mode: "insensitive",
              },
            },
          },
        },
      ],
    })
  }

  if (filters.target.trim()) {
    conditions.push({
      OR: [
        {
          targetUser: {
            is: {
              email: {
                contains: filters.target.trim(),
                mode: "insensitive",
              },
            },
          },
        },
        {
          targetUser: {
            is: {
              name: {
                contains: filters.target.trim(),
                mode: "insensitive",
              },
            },
          },
        },
      ],
    })
  }

  if (filters.ip.trim()) {
    conditions.push({
      ipAddress: {
        contains: filters.ip.trim(),
        mode: "insensitive",
      },
    })
  }

  if (filters.query.trim()) {
    conditions.push({
      OR: [
        {
          actorUser: {
            is: {
              email: {
                contains: filters.query.trim(),
                mode: "insensitive",
              },
            },
          },
        },
        {
          actorUser: {
            is: {
              name: {
                contains: filters.query.trim(),
                mode: "insensitive",
              },
            },
          },
        },
        {
          targetUser: {
            is: {
              email: {
                contains: filters.query.trim(),
                mode: "insensitive",
              },
            },
          },
        },
        {
          targetUser: {
            is: {
              name: {
                contains: filters.query.trim(),
                mode: "insensitive",
              },
            },
          },
        },
        {
          ipAddress: {
            contains: filters.query.trim(),
            mode: "insensitive",
          },
        },
        {
          userAgent: {
            contains: filters.query.trim(),
            mode: "insensitive",
          },
        },
      ],
    })
  }

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {}

    if (filters.from) {
      createdAt.gte = new Date(`${filters.from}T00:00:00.000Z`)
    }

    if (filters.to) {
      createdAt.lte = new Date(`${filters.to}T23:59:59.999Z`)
    }

    conditions.push({ createdAt })
  }

  return conditions.length > 0 ? { AND: conditions } : {}
}

export async function getAdminActivityData(filters: AdminActivityFilters & { page: number }): Promise<AdminActivityResponse> {
  const safePage = Math.max(filters.page, 1)
  const where = buildActivityWhere(filters)

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * ADMIN_ACTIVITY_PAGE_SIZE,
      take: ADMIN_ACTIVITY_PAGE_SIZE,
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
    prisma.activityLog.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ACTIVITY_PAGE_SIZE))

  return {
    items: items.map(serializeActivityExplorer),
    pagination: {
      page: safePage,
      limit: ADMIN_ACTIVITY_PAGE_SIZE,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
    filters,
  }
}

export async function getAdminActivityExportRows(filters: AdminActivityFilters) {
  const settings = await getAdminSettingValues()
  const where = buildActivityWhere(filters)

  const items = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: settings.exportMaxRows,
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
  })

  return {
    limit: settings.exportMaxRows,
    items: items.map(serializeActivityExplorer),
  }
}

export async function getAdminSavedViews(scope?: AdminSavedViewScope, viewerRole?: AdminStaffRole) {
  const items = await prisma.adminSavedView.findMany({
    where: scope ? { scope } : undefined,
    orderBy: [
      { scope: "asc" },
      { isDefault: "desc" },
      { updatedAt: "desc" },
    ],
    include: {
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  return items
    .map((item) => serializeSavedView(item as SavedViewWithUser))
    .filter((item) => (viewerRole ? canAccessSavedViewScope(viewerRole, item.scope) : true))
}

export async function getAdminDefaultSavedView(scope: AdminSavedViewScope, viewerRole?: AdminStaffRole) {
  if (viewerRole && !canAccessSavedViewScope(viewerRole, scope)) {
    return null
  }

  const item = await prisma.adminSavedView.findFirst({
    where: {
      scope,
      isDefault: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  return item ? serializeSavedView(item as SavedViewWithUser) : null
}

export async function getAdminReportsData(viewerRole?: AdminStaffRole): Promise<AdminReportsData> {
  return {
    items: await getAdminSavedViews(undefined, viewerRole),
  }
}

export async function getAdminSystemData(): Promise<AdminSystemData> {
  const { getAdminSystemHealthData } = await import("@/lib/admin/system-data")
  return getAdminSystemHealthData()
}

export async function getAdminSettingsData(currentAdmin: {
  name: string
  email: string
  role: AdminStaffRole
}) {
  const [staffCount, superAdminCount, inactiveUsers, savedViews, pendingApprovals, values] = await Promise.all([
    prisma.user.count({
      where: {
        role: {
          not: "USER",
        },
      },
    }),
    prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    }),
    prisma.user.count({
      where: { isActive: false },
    }),
    prisma.adminSavedView.count(),
    prisma.adminApprovalRequest.count({
      where: { status: "PENDING" },
    }),
    getAdminSettingValues(),
  ])

  return {
    currentAdmin,
    security: {
      sessionStrategy: "NextAuth JWT oturumu",
      roleGuard: "Proxy + server layout + API permission kontrolleri",
      loginRateLimit: "Pencereli giris deneme siniri",
      approvalFlow: "Kritik islemler ikinci admin onayi ile uygulanir",
    },
    governance: {
      staffCount,
      superAdminCount,
      inactiveUsers,
      savedViews,
      pendingApprovals,
    },
    values,
    definitions: ADMIN_SETTING_DEFINITIONS,
  }
}

export function getAdminSettingFallbacks(): AdminSettingValueMap {
  return {
    ...ADMIN_SETTING_DEFAULTS,
  }
}
