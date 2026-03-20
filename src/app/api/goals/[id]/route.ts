import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { prisma } from "@/lib/prisma"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { goalSchema } from "@/lib/validations"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "goals", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

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
    const month = parsed.period === "MONTHLY" ? parsed.month ?? now.getMonth() + 1 : null

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
      return NextResponse.json({ error: "Hedef bulunamadi" }, { status: 404 })
    }

    const goal = await prisma.goal.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    })

    revalidateTag(CACHE_TAGS.goals, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")

    return NextResponse.json(goal)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gecersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "goals", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  const { id } = await params

  const deleted = await prisma.goal.deleteMany({
    where: { id, userId: session.user.id },
  })

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Hedef bulunamadi" }, { status: 404 })
  }

  revalidateTag(CACHE_TAGS.goals, "max")
  revalidateTag(CACHE_TAGS.dashboard, "max")

  return NextResponse.json({ message: "Hedef silindi" })
}

