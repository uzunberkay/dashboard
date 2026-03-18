import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

const CATEGORY_TREE = [
  { name: "Konut", icon: "home", children: ["Kira", "Aidat", "Tamirat/Bakım"] },
  { name: "Faturalar", icon: "zap", children: ["Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon"] },
  { name: "Market & Gıda", icon: "shopping-cart", children: ["Market", "Manav/Kasap", "Online Market"] },
  { name: "Ulaşım", icon: "car", children: ["Yakıt", "Toplu Taşıma", "Taksi", "Araç Bakım"] },
  { name: "Yeme & İçme", icon: "utensils", children: ["Restoran", "Kafe", "Fast Food"] },
  { name: "Sağlık", icon: "heart-pulse", children: ["İlaç", "Doktor", "Sigorta"] },
  { name: "Eğlence", icon: "gamepad-2", children: ["Sinema/Tiyatro", "Abonelikler", "Hobi"] },
  { name: "Giyim", icon: "shirt", children: ["Kıyafet", "Ayakkabı", "Aksesuar"] },
  { name: "Eğitim", icon: "graduation-cap", children: ["Kurs", "Kitap", "Okul"] },
  { name: "Diğer", icon: "ellipsis", children: [] },
]

export async function POST(req: Request) {
  const rateLimitResponse = getRateLimitResponse(req, "register")
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const { name, email, password } = registerSchema.parse(body)

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kayıtlı" },
        { status: 409 }
      )
    }

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    })

    for (let i = 0; i < CATEGORY_TREE.length; i++) {
      const main = CATEGORY_TREE[i]
      const parent = await prisma.category.create({
        data: {
          name: main.name,
          icon: main.icon,
          sortOrder: i,
          isSystem: true,
          parentId: null,
          userId: user.id,
        },
      })

      for (let j = 0; j < main.children.length; j++) {
        await prisma.category.create({
          data: {
            name: main.children[j],
            sortOrder: j,
            isSystem: true,
            parentId: parent.id,
            userId: user.id,
          },
        })
      }
    }

    return NextResponse.json(
      { message: "Kayıt başarılı", userId: user.id },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 })
    }
    logger.error("Register request failed", error)
    return NextResponse.json(
      { error: "Bir hata oluştu" },
      { status: 500 }
    )
  }
}
