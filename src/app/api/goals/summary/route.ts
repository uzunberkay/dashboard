import { NextRequest, NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"

const getCachedGoalSummary = unstable_cache(
  async (userId: string, year: number) => {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year + 1, 0, 1)

    const [yearIncome, yearExpense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "INCOME",
          date: { gte: yearStart, lt: yearEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: "EXPENSE",
          date: { gte: yearStart, lt: yearEnd },
        },
        _sum: { amount: true },
      }),
    ])

    return {
      income: yearIncome._sum.amount || 0,
      expense: yearExpense._sum.amount || 0,
      balance: (yearIncome._sum.amount || 0) - (yearExpense._sum.amount || 0),
    }
  },
  ["goals-summary-data-v1"],
  {
    revalidate: 30,
    tags: [CACHE_TAGS.goalsSummary],
  }
)

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const searchParams = req.nextUrl.searchParams
  const year = Number(searchParams.get("year") || new Date().getFullYear())
  const response = await getCachedGoalSummary(session.user.id, year)
  return NextResponse.json(response)
}
