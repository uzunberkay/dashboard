import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { syncRecurringSchedulesForUser } from "@/lib/finance-assistant"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { recurringRuleSchema } from "@/lib/validations"

export async function GET() {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rules = await prisma.recurringRule.findMany({
    where: { userId: session.user.id },
    include: {
      category: { select: { id: true, name: true } },
    },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "recurring-rules", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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

    const rule = await prisma.recurringRule.create({
      data: {
        userId: session.user.id,
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
      include: {
        category: { select: { id: true, name: true } },
      },
    })

    await syncRecurringSchedulesForUser(
      prisma,
      session.user.id,
      new Date(),
      new Date(new Date().getFullYear(), new Date().getMonth() + 3, 1)
    )

    revalidateTag(CACHE_TAGS.recurringRules, "max")
    revalidateTag(CACHE_TAGS.scheduledPayments, "max")
    revalidateTag(CACHE_TAGS.reminders, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")
    revalidateTag(CACHE_TAGS.categories, "max")

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
