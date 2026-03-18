import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const searchParams = req.nextUrl.searchParams
  const year = Number(searchParams.get("year") || new Date().getFullYear())

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  const [yearIncome, yearExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: "INCOME",
        date: { gte: yearStart, lt: yearEnd },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: "EXPENSE",
        date: { gte: yearStart, lt: yearEnd },
      },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    income: yearIncome._sum.amount || 0,
    expense: yearExpense._sum.amount || 0,
    balance: (yearIncome._sum.amount || 0) - (yearExpense._sum.amount || 0),
  })
}
