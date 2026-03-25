import { ActivityLogEvent } from "@prisma/client"
import { hash } from "bcryptjs"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getRateLimitResponse } from "@/lib/rate-limit"
import { registerSchema } from "@/lib/validations"

const CATEGORY_TREE = [
  { name: "Konut", icon: "home", children: ["Kira", "Aidat", "Tamirat/Bakim"] },
  { name: "Faturalar", icon: "zap", children: ["Elektrik", "Su", "Dogalgaz", "Internet", "Telefon"] },
  { name: "Market & Gida", icon: "shopping-cart", children: ["Market", "Manav/Kasap", "Online Market"] },
  { name: "Ulasim", icon: "car", children: ["Yakit", "Toplu Tasima", "Taksi", "Arac Bakim"] },
  { name: "Yeme & Icme", icon: "utensils", children: ["Restoran", "Kafe", "Fast Food"] },
  { name: "Saglik", icon: "heart-pulse", children: ["Ilac", "Doktor", "Sigorta"] },
  { name: "Eglence", icon: "gamepad-2", children: ["Sinema/Tiyatro", "Abonelikler", "Hobi"] },
  { name: "Giyim", icon: "shirt", children: ["Kiyafet", "Ayakkabi", "Aksesuar"] },
  { name: "Egitim", icon: "graduation-cap", children: ["Kurs", "Kitap", "Okul"] },
  { name: "Diger", icon: "ellipsis", children: [] },
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
      return NextResponse.json({ error: "Bu e-posta adresi zaten kayitli" }, { status: 409 })
    }

    const staffCount = await prisma.user.count({
      where: {
        role: {
          not: "USER",
        },
      },
    })

    const hashedPassword = await hash(password, 12)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: staffCount === 0 ? "SUPER_ADMIN" : "USER",
      },
    })

    for (let i = 0; i < CATEGORY_TREE.length; i += 1) {
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

      for (let j = 0; j < main.children.length; j += 1) {
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

    await prisma.activityLog.create({
      data: {
        event: ActivityLogEvent.USER_CREATED,
        targetUserId: user.id,
        metadata: {
          bootstrapRole: user.role,
        },
      },
    })

    return NextResponse.json(
      {
        message: "Kayit basarili",
        userId: user.id,
        role: user.role,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Gecersiz veri" }, { status: 400 })
    }

    logger.error("Register request failed", error)
    return NextResponse.json({ error: "Bir hata olustu" }, { status: 500 })
  }
}
