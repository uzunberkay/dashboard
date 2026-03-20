import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()
const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development"
const enableDemoSeed = process.env.ENABLE_DEMO_SEED !== "false"

const CATEGORY_TREE = [
  {
    name: "Konut",
    icon: "home",
    children: ["Kira", "Aidat", "Tamirat/Bakim"],
  },
  {
    name: "Faturalar",
    icon: "zap",
    children: ["Elektrik", "Su", "Dogalgaz", "Internet", "Telefon"],
  },
  {
    name: "Market & Gida",
    icon: "shopping-cart",
    children: ["Market", "Manav/Kasap", "Online Market"],
  },
  {
    name: "Ulasim",
    icon: "car",
    children: ["Yakit", "Toplu Tasima", "Taksi", "Arac Bakim"],
  },
  {
    name: "Yeme & Icme",
    icon: "utensils",
    children: ["Restoran", "Kafe", "Fast Food"],
  },
  {
    name: "Saglik",
    icon: "heart-pulse",
    children: ["Ilac", "Doktor", "Sigorta"],
  },
  {
    name: "Eglence",
    icon: "gamepad-2",
    children: ["Sinema/Tiyatro", "Abonelikler", "Hobi"],
  },
  {
    name: "Giyim",
    icon: "shirt",
    children: ["Kiyafet", "Ayakkabi", "Aksesuar"],
  },
  {
    name: "Egitim",
    icon: "graduation-cap",
    children: ["Kurs", "Kitap", "Okul"],
  },
  {
    name: "Diger",
    icon: "ellipsis",
    children: [],
  },
]

export async function seedCategoriesForUser(userId: string) {
  for (let i = 0; i < CATEGORY_TREE.length; i += 1) {
    const main = CATEGORY_TREE[i]
    const parent = await prisma.category.create({
      data: {
        name: main.name,
        icon: main.icon,
        sortOrder: i,
        isSystem: true,
        parentId: null,
        userId,
      },
    })

    for (let j = 0; j < main.children.length; j += 1) {
      await prisma.category.create({
        data: {
          name: main.children[j],
          sortOrder: j,
          isSystem: true,
          parentId: parent.id,
          userId,
        },
      })
    }
  }
}

async function main() {
  if (appEnv === "production" || !enableDemoSeed) {
    console.log("Demo seed skipped for this environment.")
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: "demo@example.com" },
  })

  if (existingUser) {
    console.log("Demo kullanici zaten mevcut, seed atlaniyor.")
    return
  }

  const hashedPassword = await hash("demo1234", 12)

  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      password: hashedPassword,
      name: "Demo Kullanici",
      role: "ADMIN",
    },
  })

  await seedCategoriesForUser(user.id)

  console.log(`Demo kullanici olusturuldu: ${user.email}`)
  console.log("Hiyerarsik kategoriler olusturuldu.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
