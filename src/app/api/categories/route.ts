import { NextResponse } from "next/server"
import { revalidateTag, unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { categorySchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"

const getCachedCategories = unstable_cache(
  async (userId: string) =>
    prisma.category.findMany({
      where: { userId, parentId: null },
      include: {
        children: {
          include: { _count: { select: { transactions: true } } },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { transactions: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ["categories-data-v1"],
  {
    revalidate: 60,
    tags: [CACHE_TAGS.categories],
  }
)

export async function GET() {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const categories = await getCachedCategories(session.user.id)

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
    revalidateTag(CACHE_TAGS.categories, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")

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
