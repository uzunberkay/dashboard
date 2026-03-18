import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()
const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "development"
const enableDemoSeed = process.env.ENABLE_DEMO_SEED !== "false"

const CATEGORY_TREE = [
  {
    name: "Konut",
    icon: "home",
    children: ["Kira", "Aidat", "Tamirat/Bakım"],
  },
  {
    name: "Faturalar",
    icon: "zap",
    children: ["Elektrik", "Su", "Doğalgaz", "İnternet", "Telefon"],
  },
  {
    name: "Market & Gıda",
    icon: "shopping-cart",
    children: ["Market", "Manav/Kasap", "Online Market"],
  },
  {
    name: "Ulaşım",
    icon: "car",
    children: ["Yakıt", "Toplu Taşıma", "Taksi", "Araç Bakım"],
  },
  {
    name: "Yeme & İçme",
    icon: "utensils",
    children: ["Restoran", "Kafe", "Fast Food"],
  },
  {
    name: "Sağlık",
    icon: "heart-pulse",
    children: ["İlaç", "Doktor", "Sigorta"],
  },
  {
    name: "Eğlence",
    icon: "gamepad-2",
    children: ["Sinema/Tiyatro", "Abonelikler", "Hobi"],
  },
  {
    name: "Giyim",
    icon: "shirt",
    children: ["Kıyafet", "Ayakkabı", "Aksesuar"],
  },
  {
    name: "Eğitim",
    icon: "graduation-cap",
    children: ["Kurs", "Kitap", "Okul"],
  },
  {
    name: "Diğer",
    icon: "ellipsis",
    children: [],
  },
]

export async function seedCategoriesForUser(userId: string) {
  for (let i = 0; i < CATEGORY_TREE.length; i++) {
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

    for (let j = 0; j < main.children.length; j++) {
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
    console.log("Demo kullanıcı zaten mevcut, seed atlanıyor.")
    return
  }

  const hashedPassword = await hash("demo1234", 12)

  const user = await prisma.user.create({
    data: {
      email: "demo@example.com",
      password: hashedPassword,
      name: "Demo Kullanıcı",
    },
  })

  await seedCategoriesForUser(user.id)

  console.log(`Demo kullanıcı oluşturuldu: ${user.email}`)
  console.log("Hiyerarşik kategoriler oluşturuldu.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
