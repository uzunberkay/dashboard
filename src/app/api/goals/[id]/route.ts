import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { goalSchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "goals", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = await req.json()
    const parsed = goalSchema.parse(body)
    const categoryId = parsed.scope === "CATEGORY" ? parsed.categoryId : null

    if (parsed.scope === "CATEGORY" && !categoryId) {
      return NextResponse.json({ error: "Kategori secimi zorunludur" }, { status: 400 })
    }

    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: session.user.id },
        select: { id: true },
      })

      if (!category) {
        return NextResponse.json({ error: "Yetkisiz kategori erisimi" }, { status: 403 })
      }
    }

    const now = new Date()
    const year = parsed.year || now.getFullYear()
    const month =
      parsed.period === "MONTHLY"
        ? parsed.month ?? now.getMonth() + 1
        : null

    const updated = await prisma.goal.updateMany({
      where: { id, userId: session.user.id },
      data: {
        scope: parsed.scope,
        period: parsed.period,
        direction: parsed.direction,
        targetAmount: parsed.targetAmount,
        year,
        month,
        categoryId,
      },
    })

    if (updated.count === 0) {
      return NextResponse.json({ error: "Hedef bulunamadı" }, { status: 404 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    })

    return NextResponse.json(goal)
  } catch (err) {
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

  const rateLimitResponse = getRateLimitResponse(_req, "goals", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  const deleted = await prisma.goal.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Hedef bulunamadı" }, { status: 404 })
  }

  return NextResponse.json({ message: "Hedef silindi" })
}

