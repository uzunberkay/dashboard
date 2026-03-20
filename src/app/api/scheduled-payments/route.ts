import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import type { ScheduledPaymentStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { syncRecurringSchedulesForUser } from "@/lib/finance-assistant"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { scheduledPaymentCreateSchema } from "@/lib/validations"

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const month = req.nextUrl.searchParams.get("month")
  const status = req.nextUrl.searchParams.get("status")
  const upcoming = req.nextUrl.searchParams.get("upcoming")
  const normalizedStatus =
    status === "PENDING" || status === "PAID" || status === "SKIPPED"
      ? (status as ScheduledPaymentStatus)
      : null

  let rangeStart = new Date()
  let rangeEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 1)

  if (month) {
    const [year, monthNumber] = month.split("-").map(Number)
    rangeStart = new Date(year, monthNumber - 1, 1)
    rangeEnd = new Date(year, monthNumber, 1)
  } else if (upcoming === "true") {
    rangeStart = new Date()
    rangeEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1)
  }

  await syncRecurringSchedulesForUser(prisma, session.user.id, rangeStart, rangeEnd)

  const scheduledPayments = await prisma.scheduledPayment.findMany({
    where: {
      userId: session.user.id,
      dueDate: { gte: rangeStart, lt: rangeEnd },
      ...(normalizedStatus ? { status: normalizedStatus } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      recurringRule: { select: { id: true, name: true, isSubscription: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
  })

  return NextResponse.json(scheduledPayments)
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "scheduled-payments", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await req.json()
    const data = scheduledPaymentCreateSchema.parse(body)

    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          userId: session.user.id,
        },
        select: { id: true },
      })

      if (!category) {
        return NextResponse.json({ error: "Yetkisiz kategori erisimi" }, { status: 403 })
      }
    }

    const scheduledPayment = await prisma.scheduledPayment.create({
      data: {
        userId: session.user.id,
        name: data.name,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        dueDate: new Date(data.dueDate),
        categoryId: data.categoryId || null,
        recurringRuleId: data.recurringRuleId || null,
        source: data.source,
      },
      include: {
        category: { select: { id: true, name: true } },
        recurringRule: { select: { id: true, name: true, isSubscription: true } },
      },
    })

    revalidateTag(CACHE_TAGS.scheduledPayments, "max")
    revalidateTag(CACHE_TAGS.reminders, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")
    revalidateTag(CACHE_TAGS.categories, "max")

    return NextResponse.json(scheduledPayment, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
