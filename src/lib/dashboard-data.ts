import { prisma } from "@/lib/prisma"
import {
  buildActionCenter,
  buildForecast,
  buildMonthlyDigestPreview,
  buildPriorityList,
  calculateHealthScore,
  ensureNotificationPreference,
  ensurePaymentRemindersForUser,
  getMonthWindow,
  startOfDay,
  syncRecurringSchedulesForUser,
  toDateKey,
} from "@/lib/finance-assistant"
import type { DashboardData } from "@/types"

const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
]

function getPercentChange(current: number, previous: number) {
  if (previous === 0) {
    return null
  }

  return ((current - previous) / previous) * 100
}

function getGoalProgress(
  goal: {
    direction: string
    targetAmount: number
  },
  summary: { totalExpense: number; balance: number }
) {
  if (goal.direction === "SPEND_MAX") {
    const currentAmount = summary.totalExpense
    const percentage = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0

    return {
      targetAmount: goal.targetAmount,
      currentAmount,
      remainingAmount: goal.targetAmount - currentAmount,
      percentage,
      status: percentage >= 100 ? "danger" : percentage >= 80 ? "warning" : "safe",
    } as const
  }

  const currentAmount = summary.balance
  const percentage = goal.targetAmount > 0 ? (currentAmount / goal.targetAmount) * 100 : 0

  return {
    targetAmount: goal.targetAmount,
    currentAmount,
    remainingAmount: goal.targetAmount - currentAmount,
    percentage,
    status: percentage >= 100 ? "safe" : percentage >= 50 ? "warning" : "danger",
  } as const
}

function getDailyVarianceRatio(values: number[], average: number) {
  if (values.length === 0 || average <= 0) {
    return 0
  }

  const totalVariance = values.reduce((sum, value) => sum + Math.abs(value - average), 0)
  return totalVariance / values.length / average
}

function resolveMonth(monthParam?: string | null) {
  const now = new Date()

  let year = now.getFullYear()
  let month = now.getMonth()

  if (monthParam) {
    const [parsedYear, parsedMonth] = monthParam.split("-").map(Number)
    if (Number.isFinite(parsedYear) && Number.isFinite(parsedMonth)) {
      year = parsedYear
      month = parsedMonth - 1
    }
  }

  return { now, year, month }
}

function getShouldRunAutomation(monthEnd: Date, now: Date) {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return monthEnd > currentMonthStart
}

function getScheduledPaymentQuery(userId: string, rangeStart: Date, rangeEnd: Date) {
  return prisma.scheduledPayment.findMany({
    where: {
      userId,
      dueDate: { gte: rangeStart, lt: rangeEnd },
    },
    include: {
      category: { select: { id: true, name: true } },
      recurringRule: {
        select: {
          id: true,
          name: true,
          isSubscription: true,
          reminderDaysBefore: true,
        },
      },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  })
}

function normalizeGoals(
  goals: Array<{
    id: string
    scope: string
    period: string
    direction: string
    targetAmount: number
    year: number
    month: number | null
    categoryId: string | null
    category: { id: string; name: string } | null
  }>
) {
  return goals.map((goal) => ({
    id: goal.id,
    scope: goal.scope as "OVERALL" | "CATEGORY",
    period: goal.period as "MONTHLY" | "YEARLY",
    direction: goal.direction as "SAVE" | "SPEND_MAX",
    targetAmount: goal.targetAmount,
    year: goal.year,
    month: goal.month,
    categoryId: goal.categoryId,
    category: goal.category,
  }))
}

export function getDefaultDashboardMonth(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export async function getDashboardData(options: {
  userId: string
  monthParam?: string | null
}): Promise<DashboardData> {
  const { userId, monthParam } = options
  const { now, year, month } = resolveMonth(monthParam)

  const { start: monthStart, end: monthEnd } = getMonthWindow(year, month)
  const { start: previousMonthStart, end: previousMonthEnd } = getMonthWindow(year, month - 1)
  const currentMonthValue = `${year}-${String(month + 1).padStart(2, "0")}`
  const currentLabel = monthStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
  const previousLabel = previousMonthStart.toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  })
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month
  const shouldRunAutomation = getShouldRunAutomation(monthEnd, now)
  const scheduledRangeEnd = new Date(year, month + 2, 1)

  const [notificationPreference, syncedScheduledPayments] = await Promise.all([
    shouldRunAutomation ? ensureNotificationPreference(prisma, userId) : Promise.resolve(null),
    shouldRunAutomation
      ? syncRecurringSchedulesForUser(prisma, userId, monthStart, scheduledRangeEnd)
      : getScheduledPaymentQuery(userId, monthStart, scheduledRangeEnd),
  ])

  if (notificationPreference) {
    await ensurePaymentRemindersForUser(
      prisma,
      userId,
      syncedScheduledPayments.map((payment) => ({
        id: payment.id,
        dueDate: payment.dueDate,
        status: payment.status,
        recurringRule: payment.recurringRule
          ? { reminderDaysBefore: payment.recurringRule.reminderDaysBefore }
          : null,
      })),
      notificationPreference
    )
  }

  const [
    incomeAgg,
    expenseAgg,
    previousIncomeAgg,
    previousExpenseAgg,
    categoryExpenses,
    previousCategoryExpenses,
    dailyExpenses,
    incomeTransactions,
    recentTransactions,
    goals,
    budgetCategories,
    transactionCount,
    previousTransactionCount,
    incomeCount,
    expenseCount,
    highestExpenseTransaction,
    recurringRules,
    inAppReminders,
    monthlyReport,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "INCOME",
        date: { gte: previousMonthStart, lt: previousMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: previousMonthStart, lt: previousMonthEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: previousMonthStart, lt: previousMonthEnd },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
      select: { date: true, amount: true },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        type: "INCOME",
        date: { gte: monthStart, lt: monthEnd },
      },
      select: { date: true, amount: true },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: monthStart, lt: monthEnd },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            parent: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.goal.findMany({
      where: {
        userId,
        OR: [
          { period: "MONTHLY", year, month: month + 1 },
          { period: "YEARLY", year },
        ],
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    }),
    prisma.category.findMany({
      where: {
        userId,
        budgetLimit: { not: null },
      },
      include: {
        parent: { select: { name: true } },
        children: { select: { id: true } },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        date: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        date: { gte: previousMonthStart, lt: previousMonthEnd },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        type: "INCOME",
        date: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.transaction.count({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
    }),
    prisma.transaction.findFirst({
      where: {
        userId,
        type: "EXPENSE",
        date: { gte: monthStart, lt: monthEnd },
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ amount: "desc" }, { date: "desc" }],
    }),
    prisma.recurringRule.findMany({
      where: {
        userId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    shouldRunAutomation
      ? prisma.reminder.findMany({
          where: {
            userId,
            channel: "IN_APP",
            status: "PENDING",
            OR: [
              { sendAt: { lte: monthEnd } },
              {
                scheduledPayment: {
                  dueDate: { gte: monthStart, lt: monthEnd },
                },
              },
            ],
          },
          include: {
            scheduledPayment: {
              select: {
                id: true,
                name: true,
                dueDate: true,
                amount: true,
                status: true,
              },
            },
          },
          orderBy: { sendAt: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.monthlyReport.findUnique({
      where: {
        userId_year_month: {
          userId,
          year,
          month: month + 1,
        },
      },
    }),
  ])

  const totalIncome = incomeAgg._sum.amount || 0
  const totalExpense = expenseAgg._sum.amount || 0
  const balance = totalIncome - totalExpense
  const previousIncome = previousIncomeAgg._sum.amount || 0
  const previousExpense = previousExpenseAgg._sum.amount || 0
  const previousBalance = previousIncome - previousExpense

  const subCategoryIds = categoryExpenses.map((item) => item.categoryId!).filter(Boolean)
  const previousCategoryIds = previousCategoryExpenses.map((item) => item.categoryId!).filter(Boolean)
  const categoryMeta = await prisma.category.findMany({
    where: {
      id: { in: Array.from(new Set([...subCategoryIds, ...previousCategoryIds])) },
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  })

  const categoryById = new Map(categoryMeta.map((category) => [category.id, category]))
  const previousCategoryMap = new Map<string, number>()
  const parentTotals = new Map<string, { name: string; amount: number; categoryIds: string[] }>()
  const spentByCategoryId = new Map(
    categoryExpenses.map((item) => [item.categoryId!, item._sum.amount || 0])
  )

  for (const expense of previousCategoryExpenses) {
    const meta = categoryById.get(expense.categoryId!)
    if (!meta) {
      continue
    }

    const parentId = meta.parent?.id || meta.id
    previousCategoryMap.set(parentId, (previousCategoryMap.get(parentId) || 0) + (expense._sum.amount || 0))
  }

  for (const expense of categoryExpenses) {
    const meta = categoryById.get(expense.categoryId!)
    if (!meta) {
      continue
    }

    const parentId = meta.parent?.id || meta.id
    const parentName = meta.parent?.name || meta.name
    const amount = expense._sum.amount || 0
    const existing = parentTotals.get(parentId)

    if (existing) {
      existing.amount += amount
      if (expense.categoryId && !existing.categoryIds.includes(expense.categoryId)) {
        existing.categoryIds.push(expense.categoryId)
      }
    } else {
      parentTotals.set(parentId, {
        name: parentName,
        amount,
        categoryIds: expense.categoryId ? [expense.categoryId] : [],
      })
    }
  }

  const categoryData = Array.from(parentTotals.entries()).map(([id, item], index) => ({
    id,
    name: item.name,
    value: item.amount,
    fill: CHART_COLORS[index % CHART_COLORS.length],
    categoryIds: item.categoryIds,
  }))
  categoryData.sort((first, second) => second.value - first.value)

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dailyMap = new Map<string, number>()

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    dailyMap.set(dateKey, 0)
  }

  for (const transaction of dailyExpenses) {
    const dateKey = toDateKey(new Date(transaction.date))
    dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + transaction.amount)
  }

  const dailyData = Array.from(dailyMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }))

  const peakExpenseDay = dailyData.reduce<{ date: string; amount: number } | null>((peakDay, item) => {
    if (item.amount <= 0) {
      return peakDay
    }

    if (!peakDay || item.amount > peakDay.amount) {
      return item
    }

    return peakDay
  }, null)

  const incomeDayMap = new Map<string, number>()
  for (const transaction of incomeTransactions) {
    const dateKey = toDateKey(new Date(transaction.date))
    incomeDayMap.set(dateKey, (incomeDayMap.get(dateKey) || 0) + transaction.amount)
  }
  const highestIncomeDay = Array.from(incomeDayMap.entries()).reduce<{ date: string; amount: number } | null>((best, [date, amount]) => {
    if (!best || amount > best.amount) {
      return { date, amount }
    }
    return best
  }, null)

  const budgetStatuses = budgetCategories
    .map((category) => {
      const categoryIds = category.parentId
        ? [category.id]
        : [category.id, ...category.children.map((child) => child.id)]
      const spent = categoryIds.reduce((sum, categoryId) => sum + (spentByCategoryId.get(categoryId) || 0), 0)
      const percentage = category.budgetLimit ? (spent / category.budgetLimit) * 100 : 0

      return {
        categoryId: category.id,
        categoryName: category.name,
        parentName: category.parent?.name,
        budgetLimit: category.budgetLimit!,
        totalSpent: spent,
        percentage,
        status: percentage >= 100
          ? ("danger" as const)
          : percentage >= 80
            ? ("warning" as const)
            : ("safe" as const),
      }
    })
    .sort((first, second) => second.percentage - first.percentage)

  const topCategory = categoryData[0] ?? null
  const averageDivisor = isCurrentMonth ? Math.max(now.getDate(), 1) : daysInMonth
  const dailyAverage = averageDivisor > 0 ? totalExpense / averageDivisor : 0
  const positiveExpenseDays = dailyData.filter((item) => item.amount > 0).map((item) => item.amount)
  const averageVarianceRatio = getDailyVarianceRatio(positiveExpenseDays, dailyAverage)

  const monthlyOverallGoals = goals.filter((goal) => goal.scope === "OVERALL" && goal.period === "MONTHLY")
  const yearlyOverallGoals = goals.filter((goal) => goal.scope === "OVERALL" && goal.period === "YEARLY")
  const monthlyGoalForInsights =
    monthlyOverallGoals.find((goal) => goal.direction === "SPEND_MAX") ??
    monthlyOverallGoals[0] ??
    null
  const monthlyGoalProgress = monthlyGoalForInsights
    ? getGoalProgress(monthlyGoalForInsights, { totalExpense, balance })
    : null

  const budgetAlertCount = budgetStatuses.filter((item) => item.status !== "safe").length
  const overBudgetCount = budgetStatuses.filter((item) => item.status === "danger").length
  const healthScore = calculateHealthScore({
    savingsRate: totalIncome > 0 ? (balance / totalIncome) * 100 : 0,
    balance,
    overBudgetCount,
    budgetAlertCount,
    goalStatus: monthlyGoalProgress?.status ?? "none",
    averageVarianceRatio,
  })

  const upcomingPayments = syncedScheduledPayments
    .filter((payment) => payment.status === "PENDING" && new Date(payment.dueDate) >= startOfDay(now))
    .sort((first, second) => +new Date(first.dueDate) - +new Date(second.dueDate))

  const upcomingPaymentsInWeek = upcomingPayments.filter((payment) => {
    const dueDate = new Date(payment.dueDate)
    const daysUntil = Math.ceil((dueDate.getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 7
  })

  const subscriptions = recurringRules.filter(
    (rule) => rule.isSubscription || (rule.type === "EXPENSE" && rule.frequency === "MONTHLY")
  )
  const monthlyCommitment = subscriptions.reduce((sum, rule) => {
    if (rule.frequency === "WEEKLY") {
      return sum + rule.amount * 4.33
    }

    return sum + rule.amount
  }, 0)

  const actionItems = buildActionCenter([
    ...budgetStatuses
      .filter((item) => item.status !== "safe")
      .map((item, index) => ({
        id: `budget-${item.categoryId}`,
        title: `${item.categoryName} butce baskisi altinda`,
        description: `${Math.round(item.percentage)}% kullanim nedeniyle limit takibi gerekiyor.`,
        href: `/budgets?focus=over-budget&category=${item.categoryId}`,
        tone: item.status === "danger" ? ("expense" as const) : ("warning" as const),
        ctaLabel: "Butceyi ac",
        priority: item.status === "danger" ? 100 - index : 80 - index,
      })),
    ...(monthlyGoalProgress && monthlyGoalProgress.status !== "safe"
      ? [{
          id: "goal-risk",
          title: "Aylik hedef yakindan izlenmeli",
          description: monthlyGoalProgress.status === "danger"
            ? "Secili hedef bu gidisle risk altinda."
            : "Hedefe yaklasiliyor, erken aksiyon faydali olur.",
          href: "/budgets?focus=goal-risk",
          tone:
            monthlyGoalProgress.status === "danger"
              ? ("expense" as const)
              : ("warning" as const),
          ctaLabel: "Hedeflere git",
          priority: monthlyGoalProgress.status === "danger" ? 92 : 72,
        }]
      : []),
    ...(upcomingPaymentsInWeek.length > 0
      ? [{
          id: "upcoming-payments",
          title: `${upcomingPaymentsInWeek.length} odeme yaklasiyor`,
          description: "Gelecek 7 gun icindeki planli odemeleri kontrol edin.",
          href: "/budgets?focus=scheduled-payments",
          tone: "warning" as const,
          ctaLabel: "Odemeleri incele",
          priority: 76,
        }]
      : []),
    ...(previousIncome > 0 && totalIncome < previousIncome
      ? [{
          id: "income-drop",
          title: "Gelir gecen aya gore dususte",
          description: "Gelir tarafindaki yavaslamayi kontrol etmek faydali olabilir.",
          href: `/transactions?focus=income-drop&type=INCOME&month=${currentMonthValue}`,
          tone: "warning" as const,
          ctaLabel: "Gelir kayitlarini gor",
          priority: 68,
        }]
      : []),
    ...(topCategory && totalExpense > 0 && topCategory.value / totalExpense >= 0.35
      ? [{
          id: "category-pressure",
          title: `${topCategory.name} giderleri baskinlasiyor`,
          description: `Bu kategori toplam giderin %${Math.round((topCategory.value / totalExpense) * 100)}ini olusturuyor.`,
          href: `/transactions?focus=category-pressure&category=${topCategory.id}&type=EXPENSE&month=${currentMonthValue}`,
          tone: "expense" as const,
          ctaLabel: "Kategori akisini ac",
          priority: 66,
        }]
      : []),
    ...(subscriptions.length === 0
      ? [{
          id: "subscriptions-setup",
          title: "Tekrarlayan odemeleri tanimla",
          description: "Abonelik ve planli odeme takibi icin recurring kural ekleyin.",
          href: "/budgets?focus=recurring-rules",
          tone: "neutral" as const,
          ctaLabel: "Kurallari yonet",
          priority: 40,
        }]
      : []),
  ])

  const anomalies = [
    ...(peakExpenseDay && dailyAverage > 0 && peakExpenseDay.amount >= dailyAverage * 2
      ? [{
          id: "peak-day",
          title: "Gunluk harcama zirvesi normalin ustunde",
          description: `${peakExpenseDay.date} tarihinde gunluk ortalamanin belirgin ustune cikildi.`,
          tone: "warning" as const,
          value: `${peakExpenseDay.amount.toFixed(2)} TL`,
        }]
      : []),
    ...(topCategory && (topCategory.value - (previousCategoryMap.get(topCategory.id) || 0)) > 0
      && (previousCategoryMap.get(topCategory.id) || 0) > 0
      && ((topCategory.value - (previousCategoryMap.get(topCategory.id) || 0)) / (previousCategoryMap.get(topCategory.id) || 1)) >= 0.3
      ? [{
          id: "category-jump",
          title: `${topCategory.name} harcamasi hizli artti`,
          description: "Bu kategori onceki aya gore belirgin sekilde yukselmis gorunuyor.",
          tone: "danger" as const,
          value: `${Math.round((((topCategory.value - (previousCategoryMap.get(topCategory.id) || 0)) / (previousCategoryMap.get(topCategory.id) || 1)) * 100))}%`,
        }]
      : []),
    ...(previousExpense > 0 && totalExpense > previousExpense && ((totalExpense - previousExpense) / previousExpense) >= 0.2
      ? [{
          id: "expense-trend",
          title: "Toplam gider ritmi hizlandi",
          description: "Giderler onceki aya gore yukari yone ivmelenmis durumda.",
          tone: "warning" as const,
          value: `${Math.round(((totalExpense - previousExpense) / previousExpense) * 100)}%`,
        }]
      : []),
  ]

  const forecast = buildForecast({
    totalIncome,
    totalExpense,
    dailyAverageExpense: dailyAverage,
    year,
    monthIndex: month,
    isCurrentMonth,
    goalStatus: monthlyGoalProgress?.status ?? null,
  })

  const calendar = [
    ...syncedScheduledPayments
      .filter((payment) => {
        const dueDate = new Date(payment.dueDate)
        return dueDate >= monthStart && dueDate < monthEnd
      })
      .slice(0, 12)
      .map((payment) => ({
        id: payment.id,
        date: toDateKey(new Date(payment.dueDate)),
        type: "scheduled-payment" as const,
        label: payment.name,
        amount: payment.amount,
        tone: payment.type === "INCOME" ? "income" as const : "expense" as const,
      })),
    ...(peakExpenseDay
      ? [{
          id: "peak-expense-day",
          date: peakExpenseDay.date,
          type: "peak-expense-day" as const,
          label: "Gider zirvesi",
          amount: peakExpenseDay.amount,
          tone: "warning" as const,
        }]
      : []),
    ...(highestIncomeDay
      ? [{
          id: "income-day",
          date: highestIncomeDay.date,
          type: "income-day" as const,
          label: "Gelir zirvesi",
          amount: highestIncomeDay.amount,
          tone: "income" as const,
        }]
      : []),
  ].sort((first, second) => first.date.localeCompare(second.date))

  const subscriptionSummary = {
    totalActive: subscriptions.filter((rule) => rule.isActive).length,
    monthlyCommitment,
    upcomingCount: upcomingPayments.filter((payment) => payment.recurringRule?.isSubscription).length,
    items: subscriptions.slice(0, 4).map((rule) => {
      const nextPayment = upcomingPayments.find((payment) => payment.recurringRuleId === rule.id)

      return {
        id: rule.id,
        name: rule.name,
        amount: rule.amount,
        nextDueDate: nextPayment ? toDateKey(new Date(nextPayment.dueDate)) : null,
        categoryName: rule.category?.name ?? null,
      }
    }),
  }

  const digestPreview = monthlyReport
    ? {
        title: monthlyReport.title,
        summary: monthlyReport.summaryText,
        highlights: Array.isArray(monthlyReport.highlightsJson)
          ? monthlyReport.highlightsJson.map((item) => String(item))
          : [],
      }
    : buildMonthlyDigestPreview({
        periodLabel: currentLabel,
        totalIncome,
        totalExpense,
        balance,
        topCategoryName: topCategory?.name ?? null,
        topCategoryShare: totalExpense > 0 && topCategory ? (topCategory.value / totalExpense) * 100 : 0,
        budgetAlertCount,
        forecastExpense: forecast.expectedExpense,
        forecastBalance: forecast.expectedBalance,
        actionItems,
      })

  const personalPriorities = buildPriorityList([
    ...budgetStatuses
      .filter((item) => item.status !== "safe")
      .map((item) => ({
        id: `priority-budget-${item.categoryId}`,
        label: item.categoryName,
        reason: `${Math.round(item.percentage)}% butce kullanimina ulasti.`,
        priority: item.status === "danger" ? 100 : 75,
      })),
    ...(upcomingPaymentsInWeek.length > 0
      ? [{
          id: "priority-payments",
          label: "Yaklasan odemeler",
          reason: `${upcomingPaymentsInWeek.length} planli odeme 7 gun icinde due olacak.`,
          priority: 82,
        }]
      : []),
    ...(topCategory
      ? [{
          id: `priority-category-${topCategory.id}`,
          label: topCategory.name,
          reason: "Bu kategori bu donemde en yuksek harcama baskisini olusturuyor.",
          priority: 60,
        }]
      : []),
  ])

  return {
    summary: {
      totalIncome,
      totalExpense,
      balance,
    },
    period: {
      value: currentMonthValue,
      label: currentLabel,
      previousLabel,
    },
    comparison: {
      previousIncome,
      previousExpense,
      previousBalance,
      incomeDelta: totalIncome - previousIncome,
      expenseDelta: totalExpense - previousExpense,
      balanceDelta: balance - previousBalance,
      incomeDeltaPct: getPercentChange(totalIncome, previousIncome),
      expenseDeltaPct: getPercentChange(totalExpense, previousExpense),
      balanceDeltaPct: getPercentChange(balance, previousBalance),
    },
    activity: {
      transactionCount,
      previousTransactionCount,
      incomeCount,
      expenseCount,
      peakExpenseDay,
      highestExpenseTransaction: highestExpenseTransaction
        ? {
            id: highestExpenseTransaction.id,
            description: highestExpenseTransaction.description,
            amount: highestExpenseTransaction.amount,
            date: toDateKey(new Date(highestExpenseTransaction.date)),
            categoryName: highestExpenseTransaction.category?.name ?? null,
          }
        : null,
    },
    insights: {
      savingsRate: totalIncome > 0 ? (balance / totalIncome) * 100 : 0,
      dailyAverage,
      topCategory: topCategory
        ? {
            id: topCategory.id,
            name: topCategory.name,
            amount: topCategory.value,
            share: totalExpense > 0 ? (topCategory.value / totalExpense) * 100 : 0,
          }
        : null,
      budgetAlertCount,
      overBudgetCount,
      monthlyGoalProgress,
    },
    healthScore,
    actionCenter: actionItems,
    anomalies,
    forecast,
    calendar,
    subscriptions: subscriptionSummary,
    monthlyDigestPreview: digestPreview,
    reminders: inAppReminders.map((reminder) => ({
      id: reminder.id,
      type: reminder.type,
      channel: reminder.channel,
      status: reminder.status,
      sendAt: reminder.sendAt.toISOString(),
      sentAt: reminder.sentAt ? reminder.sentAt.toISOString() : null,
      lastError: reminder.lastError,
      scheduledPaymentId: reminder.scheduledPaymentId,
      monthlyReportId: reminder.monthlyReportId,
      scheduledPayment: reminder.scheduledPayment
        ? {
            id: reminder.scheduledPayment.id,
            name: reminder.scheduledPayment.name,
            dueDate: reminder.scheduledPayment.dueDate.toISOString(),
            amount: reminder.scheduledPayment.amount,
            status: reminder.scheduledPayment.status,
          }
        : null,
    })),
    personalPriorities,
    categoryData,
    dailyData,
    budgetStatuses,
    recentTransactions: recentTransactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type as "INCOME" | "EXPENSE",
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date.toISOString(),
      categoryId: transaction.categoryId,
      category: transaction.category,
      createdAt: transaction.createdAt.toISOString(),
    })),
    recurringRules: recurringRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      type: rule.type as "INCOME" | "EXPENSE",
      amount: rule.amount,
      description: rule.description,
      frequency: rule.frequency,
      customMonthDay: rule.customMonthDay,
      startsAt: rule.startsAt.toISOString(),
      endsAt: rule.endsAt ? rule.endsAt.toISOString() : null,
      isActive: rule.isActive,
      isSubscription: rule.isSubscription,
      reminderDaysBefore: rule.reminderDaysBefore,
      categoryId: rule.categoryId,
      category: rule.category,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
    })),
    scheduledPayments: syncedScheduledPayments.map((payment) => ({
      id: payment.id,
      name: payment.name,
      type: payment.type as "INCOME" | "EXPENSE",
      amount: payment.amount,
      description: payment.description,
      dueDate: payment.dueDate.toISOString(),
      status: payment.status,
      source: payment.source as "RECURRING" | "MANUAL",
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
      categoryId: payment.categoryId,
      category: payment.category,
      recurringRuleId: payment.recurringRuleId,
      recurringRule: payment.recurringRule,
      transactionId: payment.transactionId,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
    goals: {
      monthlyOverall: normalizeGoals(monthlyOverallGoals),
      yearlyOverall: normalizeGoals(yearlyOverallGoals),
    },
  }
}
