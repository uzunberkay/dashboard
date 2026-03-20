import { NextRequest, NextResponse } from "next/server"
import { revalidateTag, unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { goalSchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"

const getCachedGoals = unstable_cache(
  async (userId: string, year: number, monthParam: string | null) =>
    prisma.goal.findMany({
      where: {
        userId,
        year,
        OR: monthParam
          ? [
              { period: "MONTHLY", month: Number(monthParam) },
              { period: "YEARLY" },
            ]
          : [{ period: "YEARLY" }, { month: null }],
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ period: "asc" }, { scope: "asc" }],
    }),
  ["goals-data-v1"],
  {
    revalidate: 30,
    tags: [CACHE_TAGS.goals],
  }
)

export async function GET(req: NextRequest) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const searchParams = req.nextUrl.searchParams
  const year = Number(searchParams.get("year") || new Date().getFullYear())
  const monthParam = searchParams.get("month")

  const goals = await getCachedGoals(session.user.id, year, monthParam)

  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "goals", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

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

    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        scope: parsed.scope,
        period: parsed.period,
        direction: parsed.direction,
        targetAmount: parsed.targetAmount,
        year,
        month,
        categoryId,
      },
    })
    revalidateTag(CACHE_TAGS.goals, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")

    return NextResponse.json(goal, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : "GeÃ§ersiz veri"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
