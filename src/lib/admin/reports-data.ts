import { prisma } from "@/lib/prisma"
import type { AdminAggregateExportData, AdminUserRole } from "@/types/admin"

export async function getAdminAggregateExportData(): Promise<AdminAggregateExportData> {
  const [usersByRole, inactiveUsers, transactionCount, pendingApprovals, reminderCounts, monthlyReportCount] =
    await Promise.all([
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          _all: true,
        },
      }),
      prisma.user.count({
        where: { isActive: false },
      }),
      prisma.transaction.count(),
      prisma.adminApprovalRequest.count({
        where: { status: "PENDING" },
      }),
      prisma.reminder.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),
      prisma.monthlyReport.count(),
    ])

  const roleCounts: Record<AdminUserRole, number> = {
    USER: 0,
    SUPPORT: 0,
    ANALYST: 0,
    OPS_ADMIN: 0,
    SUPER_ADMIN: 0,
  }

  for (const item of usersByRole) {
    roleCounts[item.role] = item._count._all
  }

  const reminderCountMap = new Map(reminderCounts.map((item) => [item.status, item._count._all]))

  return {
    generatedAt: new Date().toISOString(),
    userCounts: roleCounts,
    inactiveUsers,
    transactionCount,
    pendingApprovals,
    reminderCounts: {
      pending: reminderCountMap.get("PENDING") ?? 0,
      failed: reminderCountMap.get("FAILED") ?? 0,
      sent: reminderCountMap.get("SENT") ?? 0,
    },
    monthlyReportCount,
  }
}
