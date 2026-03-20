import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { prisma } from "@/lib/prisma"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { reorderSchema } from "@/lib/validations"

export async function PUT(req: Request) {
  const session = await getAuthSession()
  if (!session) {
    return unauthorized()
  }

  const rateLimitResponse = getRateLimitResponse(req, "categories", session.user.id)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const body = await req.json()
    const data = reorderSchema.parse(body)

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: session.user.id },
    })

    if (!category) {
      return NextResponse.json({ error: "Kategori bulunamadi" }, { status: 404 })
    }

    const newParent = await prisma.category.findFirst({
      where: { id: data.newParentId, userId: session.user.id, parentId: null },
    })

    if (!newParent) {
      return NextResponse.json({ error: "Gecersiz ana kategori" }, { status: 400 })
    }

    const siblings = await prisma.category.findMany({
      where: {
        parentId: data.newParentId,
        userId: session.user.id,
        id: { not: data.categoryId },
      },
      orderBy: { sortOrder: "asc" },
    })

    await prisma.category.update({
      where: { id: data.categoryId },
      data: {
        parentId: data.newParentId,
        sortOrder: data.newSortOrder,
      },
    })

    let order = 0
    for (const sibling of siblings) {
      if (order === data.newSortOrder) {
        order += 1
      }

      await prisma.category.update({
        where: { id: sibling.id },
        data: { sortOrder: order },
      })

      order += 1
    }

    revalidateTag(CACHE_TAGS.categories, "max")
    revalidateTag(CACHE_TAGS.dashboard, "max")

    return NextResponse.json({ message: "Siralama guncellendi" })
  } catch {
    return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 })
  }
}

