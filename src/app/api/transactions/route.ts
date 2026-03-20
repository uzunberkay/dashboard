import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { transactionSchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const searchParams = req.nextUrl.searchParams
  const month = searchParams.get("month")
  const category = searchParams.get("category")
  const type = searchParams.get("type")
  const pageParam = searchParams.get("page")
  const page = pageParam ? Math.max(Number(pageParam) || 1, 1) : null
  const pageSize = 20

  const where: Record<string, unknown> = { userId: session.user.id }

  if (month) {
    const [year, m] = month.split("-").map(Number)
    where.date = {
      gte: new Date(year, m - 1, 1),
      lt: new Date(year, m, 1),
    }
  }

  if (category && category !== "all") {
    const children = await prisma.category.findMany({
      where: { parentId: category, userId: session.user.id },
      select: { id: true },
    })
    if (children.length > 0) {
      where.categoryId = { in: [category, ...children.map((c) => c.id)] }
    } else {
      where.categoryId = category
    }
  }

  if (type && type !== "all") {
    where.type = type
  }

  if (page) {
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ])

    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      items: transactions,
      pagination: {
        page,
        limit: pageSize,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    })
  }

  const transactions = await prisma.transaction.findMany({
    where,
    include: { category: { select: { id: true, name: true } } },
    orderBy: { date: "desc" },
  })

  return NextResponse.json(transactions)
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "transactions", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const data = transactionSchema.parse(body)

    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      return NextResponse.json({ error: "Tutar geçersiz" }, { status: 400 })
    }

    const categoryId = data.type === "EXPENSE" ? (data.categoryId || null) : null
    const category = categoryId
      ? await prisma.category.findFirst({
          where: { id: categoryId, userId: session.user.id },
          select: { id: true, name: true, budgetLimit: true },
        })
      : null

    if (categoryId && !category) {
      return NextResponse.json({ error: "Yetkisiz kategori erisimi" }, { status: 403 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        date: new Date(data.date),
        categoryId,
        userId: session.user.id,
      },
      include: { category: { select: { id: true, name: true } } },
    })

    let budgetAlert = null
    if (data.type === "EXPENSE" && categoryId) {
      if (category?.budgetLimit) {
        const now = new Date(data.date)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const totalSpent = await prisma.transaction.aggregate({
          where: {
            userId: session.user.id,
            type: "EXPENSE",
            categoryId,
            date: { gte: monthStart, lt: monthEnd },
          },
          _sum: { amount: true },
        })

        const spent = totalSpent._sum.amount || 0
        const percentage = (spent / category.budgetLimit) * 100

        if (percentage >= 100) {
          budgetAlert = {
            type: "danger",
            message: `${category.name} bütçenizi aştınız! (${Math.round(percentage)}%)`,
          }
        } else if (percentage >= 80) {
          budgetAlert = {
            type: "warning",
            message: `${category.name} bütçenizin %${Math.round(percentage)}'ini kullandınız.`,
          }
        }
      }
    }
    revalidateTag(CACHE_TAGS.dashboard, "max")
    revalidateTag(CACHE_TAGS.goalsSummary, "max")

    return NextResponse.json({ transaction, budgetAlert }, { status: 201 })
  } catch (err) {
    logger.error("Transaction create error", err, { userId: session.user.id })
    const message = err instanceof Error ? err.message : "Geçersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
