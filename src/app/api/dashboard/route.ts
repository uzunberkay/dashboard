import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
]

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const searchParams = req.nextUrl.searchParams
  const monthParam = searchParams.get("month")

  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()

  if (monthParam) {
    const [y, m] = monthParam.split("-").map(Number)
    year = y
    month = m - 1
  }

  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 1)

  const [incomeAgg, expenseAgg, categoryExpenses, dailyExpenses, recentTransactions, goals] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: "INCOME",
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: session.user.id,
          type: "EXPENSE",
          date: { gte: monthStart, lt: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          userId: session.user.id,
          type: "EXPENSE",
          date: { gte: monthStart, lt: monthEnd },
          categoryId: { not: null },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId: session.user.id,
          type: "EXPENSE",
          date: { gte: monthStart, lt: monthEnd },
        },
        select: { date: true, amount: true },
        orderBy: { date: "asc" },
      }),
      prisma.transaction.findMany({
        where: { userId: session.user.id },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              parent: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { date: "desc" },
        take: 5,
      }),
      prisma.goal.findMany({
        where: {
          userId: session.user.id,
          OR: [
            { period: "MONTHLY", year, month: month + 1 },
            { period: "YEARLY", year },
          ],
        },
      }),
    ])

  const totalIncome = incomeAgg._sum.amount || 0
  const totalExpense = expenseAgg._sum.amount || 0

  const subCategoryIds = categoryExpenses.map((c) => c.categoryId!).filter(Boolean)
  const subCategories = await prisma.category.findMany({
    where: { id: { in: subCategoryIds } },
    include: { parent: { select: { id: true, name: true } } },
  })

  const parentTotals = new Map<string, { name: string; amount: number; categoryIds: string[] }>()

  for (const expense of categoryExpenses) {
    const subCat = subCategories.find((c) => c.id === expense.categoryId)
    if (!subCat) continue

    const parentName = subCat.parent?.name || subCat.name
    const parentId = subCat.parent?.id || subCat.id
    const existing = parentTotals.get(parentId)
    const amount = expense._sum.amount || 0

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

  const categoryData = Array.from(parentTotals.entries()).map(([id, data], i) => ({
    id,
    name: data.name,
    value: data.amount,
    fill: CHART_COLORS[i % CHART_COLORS.length],
    categoryIds: data.categoryIds,
  }))

  categoryData.sort((a, b) => b.value - a.value)

  const dailyMap = new Map<string, number>()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    dailyMap.set(dateStr, 0)
  }

  for (const t of dailyExpenses) {
    const dateStr = new Date(t.date).toISOString().split("T")[0]
    dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + t.amount)
  }

  const dailyData = Array.from(dailyMap.entries()).map(([date, amount]) => ({
    date,
    amount,
  }))

  const budgetCategories = await prisma.category.findMany({
    where: {
      userId: session.user.id,
      budgetLimit: { not: null },
    },
    include: { parent: { select: { name: true } } },
  })

  const budgetStatuses = []
  for (const cat of budgetCategories) {
    const spent = categoryExpenses.find((c) => c.categoryId === cat.id)?._sum.amount || 0
    const percentage = cat.budgetLimit ? (spent / cat.budgetLimit) * 100 : 0
    budgetStatuses.push({
      categoryId: cat.id,
      categoryName: cat.name,
      parentName: cat.parent?.name,
      budgetLimit: cat.budgetLimit!,
      totalSpent: spent,
      percentage,
      status: percentage >= 100 ? "danger" : percentage >= 80 ? "warning" : "safe",
    })
  }

  budgetStatuses.sort((a, b) => b.percentage - a.percentage)

  const dailyAverage = daysInMonth > 0 ? totalExpense / daysInMonth : 0
  const topCategory = categoryData.length > 0 ? categoryData[0] : null

  const monthlyOverallGoals = goals.filter(
    (g) => g.scope === "OVERALL" && g.period === "MONTHLY"
  )
  const yearlyOverallGoals = goals.filter(
    (g) => g.scope === "OVERALL" && g.period === "YEARLY"
  )

  return NextResponse.json({
    summary: {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    },
    categoryData,
    dailyData,
    budgetStatuses,
    recentTransactions,
    analytics: {
      dailyAverage,
      topCategory: topCategory ? { name: topCategory.name, amount: topCategory.value } : null,
      monthlyTrend: totalExpense,
    },
    goals: {
      monthlyOverall: monthlyOverallGoals,
      yearlyOverall: yearlyOverallGoals,
    },
  })
}
