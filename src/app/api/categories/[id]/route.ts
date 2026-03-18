import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthSession, unauthorized } from "@/lib/get-session"
import { categorySchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(req, "categories", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  try {
    const body = await req.json()
    const data = categorySchema.parse(body)

    const existing = await prisma.category.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      budgetLimit: data.budgetLimit,
    }

    if (!existing.isSystem) {
      updateData.name = data.name
    }

    if (data.parentId !== undefined) {
      if (data.parentId === id) {
        return NextResponse.json({ error: "Kategori kendine tasinamaz" }, { status: 400 })
      }

      if (data.parentId) {
        const parent = await prisma.category.findFirst({
          where: { id: data.parentId, userId: session.user.id, parentId: null },
          select: { id: true },
        })

        if (!parent) {
          return NextResponse.json({ error: "Gecersiz ana kategori" }, { status: 400 })
        }
      }

      updateData.parentId = data.parentId
    }

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession()
  if (!session) return unauthorized()

  const rateLimitResponse = getRateLimitResponse(_req, "categories", session.user.id)
  if (rateLimitResponse) return rateLimitResponse

  const { id } = await params

  const existing = await prisma.category.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Kategori bulunamadı" }, { status: 404 })
  }

  if (existing.isSystem) {
    return NextResponse.json(
      { error: "Sistem kategorileri silinemez" },
      { status: 403 }
    )
  }

  if (!existing.parentId) {
    return NextResponse.json(
      { error: "Ana kategoriler silinemez" },
      { status: 403 }
    )
  }

  await prisma.category.delete({ where: { id } })

  return NextResponse.json({ message: "Kategori silindi" })
}
