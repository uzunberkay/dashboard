import { CACHE_TAGS } from "@/lib/cache-tags"
import { getServerEnv } from "@/lib/env"
import { getRecentErrors } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getOrSetAdminRuntimeCache } from "@/lib/admin/runtime-cache"
import { getAdminSettingValues } from "@/lib/admin/data"
import type { AdminSystemData } from "@/types/admin"

async function measureDbResponseTimeMs() {
  const startedAt = performance.now()
  await prisma.$queryRaw`SELECT 1`
  return Math.round((performance.now() - startedAt) * 100) / 100
}

export async function getAdminSystemHealthData(): Promise<AdminSystemData> {
  const settings = await getAdminSettingValues()

  return getOrSetAdminRuntimeCache(CACHE_TAGS.adminSystem, settings.systemCacheTtlSec, async () => {
    const env = getServerEnv()
    const dbResponseTimeMs = await measureDbResponseTimeMs()
    const recentErrors = getRecentErrors(8)

    const [lastFinanceJob, reminderCounts, pendingApprovals, expiredApprovals, sensitivePendingCount] = await Promise.all([
      prisma.activityLog.findFirst({
        where: {
          event: {
            in: ["FINANCE_REMINDER_JOB_SUCCEEDED", "FINANCE_REMINDER_JOB_FAILED"],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.reminder.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
      prisma.adminApprovalRequest.count({
        where: {
          status: "PENDING",
        },
      }),
      prisma.adminApprovalRequest.count({
        where: {
          status: "EXPIRED",
        },
      }),
      prisma.adminApprovalRequest.count({
        where: {
          status: "PENDING",
          actionType: {
            in: ["ADMIN_SETTINGS_UPDATE", "RAW_USER_EXPORT"],
          },
        },
      }),
    ])

    const reminderCountMap = new Map(reminderCounts.map((item) => [item.status, item._count._all]))
    const financeMetadata =
      lastFinanceJob?.metadata && typeof lastFinanceJob.metadata === "object" && !Array.isArray(lastFinanceJob.metadata)
        ? (lastFinanceJob.metadata as Record<string, unknown>)
        : null

    const apiStatus =
      recentErrors.length > 0 || dbResponseTimeMs > settings.dbDegradedThresholdMs ? "degraded" : "healthy"
    const databaseStatus = dbResponseTimeMs > settings.dbDegradedThresholdMs ? "degraded" : "healthy"

    return {
      environment: env.APP_ENV,
      apiStatus,
      databaseStatus,
      dbResponseTimeMs,
      generatedAt: new Date().toISOString(),
      policies: {
        activityRetentionDays: settings.activityRetentionDays,
        exportMaxRows: settings.exportMaxRows,
        dbDegradedThresholdMs: settings.dbDegradedThresholdMs,
        dashboardCacheTtlSec: settings.dashboardCacheTtlSec,
        systemCacheTtlSec: settings.systemCacheTtlSec,
      },
      approvals: {
        pendingCount: pendingApprovals,
        sensitivePendingCount,
        expiredCount: expiredApprovals,
      },
      financeReminderJob: {
        lastStatus:
          lastFinanceJob?.event === "FINANCE_REMINDER_JOB_SUCCEEDED"
            ? "success"
            : lastFinanceJob?.event === "FINANCE_REMINDER_JOB_FAILED"
              ? "failed"
              : "never",
        lastRunAt: lastFinanceJob?.createdAt.toISOString() ?? null,
        lastProcessedCount:
          typeof financeMetadata?.processed === "number" ? financeMetadata.processed : null,
        lastError:
          typeof financeMetadata?.errorMessage === "string" ? financeMetadata.errorMessage : null,
        pendingReminderCount: reminderCountMap.get("PENDING") ?? 0,
        failedReminderCount: reminderCountMap.get("FAILED") ?? 0,
      },
      recentErrors: recentErrors.map((error) => ({
        message: error.message,
        timestamp: error.timestamp,
        meta: error.meta,
      })),
    }
  })
}
