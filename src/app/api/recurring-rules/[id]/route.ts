import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { syncRecurringSchedulesForUser } from "@/lib/finance-assistant"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { recurringRuleSchema } from "@/lib/validations"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "recurring-rules", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { id } = await params

  try {
    const body = await req.json()
    const data = recurringRuleSchema.parse(body)

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

    const updated = await prisma.recurringRule.updateMany({
      where: { id, userId: session.user.id },
      data: {
        name: data.name,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        frequency: data.frequency,
        customMonthDay: data.customMonthDay ?? null,
        startsAt: new Date(data.startsAt),
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        isActive: data.isActive,
        isSubscription: data.isSubscription,
        reminderDaysBefore: data.reminderDaysBefore,
        categoryId: data.categoryId || null,
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: "Kural bulunamadi" }, { status: 404 })
    }

    const today = new Date()
    await prisma.scheduledPayment.updateMany({
      where: {
        recurringRuleId: id,
        userId: session.user.id,
        dueDate: { gte: today },
        status: "PENDING",
      },
      data: {
        name: data.name,
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        categoryId: data.categoryId || null,
      },
    })

    if (!data.isActive) {
      await prisma.scheduledPayment.updateMany({
        where: {
          recurringRuleId: id,
          userId: session.user.id,
          dueDate: { gte: today },
          status: "PENDING",
        },
        data: {
          status: "SKIPPED",
        },
      })
    } else {
      await syncRecurringSchedulesForUser(
        prisma,
        session.user.id,
        today,
        new Date(today.getFullYear(), today.getMonth() + 3, 1)
      )
    }

    revalidateTag(CACHE_TAGS.recurringRules, "max")
    revalidateTag(CACHE_TAGS.scheduledPayments, "max")
    revalidateTag(CACHE_TAGS.reminders, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")
    revalidateTag(CACHE_TAGS.categories, "max")

    const rule = await prisma.recurringRule.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(rule)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "recurring-rules", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { id } = await params

  const deleted = await prisma.recurringRule.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Kural bulunamadi" }, { status: 404 })
  }

  revalidateTag(CACHE_TAGS.recurringRules, "max")
  revalidateTag(CACHE_TAGS.scheduledPayments, "max")
  revalidateTag(CACHE_TAGS.reminders, "max")
  revalidateTag(CACHE_TAGS.dashboard, "max")
  revalidateTag(CACHE_TAGS.categories, "max")

  return NextResponse.json({ message: "Kural silindi" })
}
