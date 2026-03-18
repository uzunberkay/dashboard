import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { categorySchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"

export async function GET() {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const categories = await prisma.category.findMany({
    where: { userId: session.user.id, parentId: null },
    include: {
      children: {
        include: { _count: { select: { transactions: true } } },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { transactions: true } },
    },
    orderBy: { sortOrder: "asc" },
  })

  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "categories", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const data = categorySchema.parse(body)

    if (!data.parentId) {
      return NextResponse.json(
        { error: "Alt kategori eklemek için bir ana kategori seçmelisiniz" },
        { status: 400 }
      )
    }

    const parent = await prisma.category.findFirst({
      where: { id: data.parentId, userId: session.user.id, parentId: null },
    })

    if (!parent) {
      return NextResponse.json(
        { error: "Geçersiz ana kategori" },
        { status: 400 }
      )
    }

    const maxOrder = await prisma.category.aggregate({
      where: { parentId: data.parentId, userId: session.user.id },
      _max: { sortOrder: true },
    })

    const category = await prisma.category.create({
      data: {
        name: data.name,
        budgetLimit: data.budgetLimit,
        parentId: data.parentId,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        isSystem: false,
        userId: session.user.id,
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Bu kategori adı bu ana kategoride zaten mevcut" },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
  }
}
