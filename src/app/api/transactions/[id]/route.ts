import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { transactionSchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "transactions", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = await req.json()
    const data = transactionSchema.parse(body)

    const categoryId = data.type === "EXPENSE" ? (data.categoryId || null) : null
    const category = categoryId
      ? await prisma.category.findFirst({
          where: { id: categoryId, userId: session.user.id },
          select: { id: true },
        })
      : null

    if (categoryId && !category) {
      return NextResponse.json({ error: "Yetkisiz kategori erisimi" }, { status: 403 })
    }

    const result = await prisma.transaction.updateMany({
      where: { id, userId: session.user.id },
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description || null,
        date: new Date(data.date),
        categoryId,
      },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 })
    }

    const updated = await prisma.transaction.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json(updated)
  } catch (err) {
    logger.error("Transaction update error", err, { userId: session.user.id, transactionId: id })
    const message = err instanceof Error ? err.message : "Geçersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(_req, "transactions", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  const result = await prisma.transaction.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (result.count === 0) {
    return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 })
  }

  return NextResponse.json({ message: "İşlem silindi" })
}
