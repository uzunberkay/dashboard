import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { scheduledPaymentUpdateSchema } from "@/lib/validations"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "scheduled-payments", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { id } = await params

  try {
    const body = await req.json()
    const data = scheduledPaymentUpdateSchema.parse(body)

    const existing = await prisma.scheduledPayment.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: "Planli odeme bulunamadi" }, { status: 404 })
    }

    let linkedTransactionId = data.transactionId ?? existing.transactionId
    const nextStatus = data.status ?? existing.status

    if (data.createTransaction) {
      const transactionPayload = data.transaction ?? {
        type: existing.type as "INCOME" | "EXPENSE",
        amount: existing.amount,
        description: existing.description ?? existing.name,
        date: new Date(existing.dueDate).toISOString(),
        categoryId: existing.categoryId,
      }

      const createdTransaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          type: transactionPayload.type,
          amount: transactionPayload.amount,
          description: transactionPayload.description || null,
          date: new Date(transactionPayload.date),
          categoryId: transactionPayload.type === "EXPENSE" ? transactionPayload.categoryId || null : null,
        },
      })

      linkedTransactionId = createdTransaction.id
    }

    if (linkedTransactionId) {
      const transaction = await prisma.transaction.findFirst({
        where: {
          id: linkedTransactionId,
          userId: session.user.id,
        },
        select: { id: true },
      })

      if (!transaction) {
        return NextResponse.json({ error: "Baglanacak islem bulunamadi" }, { status: 404 })
      }
    }

    const updated = await prisma.scheduledPayment.update({
      where: { id },
      data: {
        status: nextStatus,
        transactionId: linkedTransactionId || null,
        paidAt: nextStatus === "PAID" ? new Date() : null,
      },
      include: {
        category: { select: { id: true, name: true } },
        recurringRule: { select: { id: true, name: true, isSubscription: true } },
      },
    })

    revalidateTag(CACHE_TAGS.scheduledPayments, "max")
    revalidateTag(CACHE_TAGS.reminders, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")
    revalidateTag(CACHE_TAGS.goalsSummary, "max")

    return NextResponse.json(updated)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
