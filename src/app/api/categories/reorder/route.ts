import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { reorderSchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"

export async function PUT(req: Request) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "categories", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const data = reorderSchema.parse(body)

    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, userId: session.user.id },
    })

    if (!category) {
      return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 })
    }

    const newParent = await prisma.category.findFirst({
      where: { id: data.newParentId, userId: session.user.id, parentId: null },
    })

    if (!newParent) {
      return NextResponse.json({ error: "Geçersiz ana kategori" }, { status: 400 })
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
    for (const sib of siblings) {
      if (order === data.newSortOrder) order++
      await prisma.category.update({
        where: { id: sib.id },
        data: { sortOrder: order },
      })
      order++
    }

    return NextResponse.json({ message: "Sıralama güncellendi" })
  } catch {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
  }
}
