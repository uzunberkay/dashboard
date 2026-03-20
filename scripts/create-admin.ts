import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()
const email = process.argv[2] ?? "admin@tuna.local"
const password = process.argv[3] ?? "Admin1234!"
const name = process.argv[4] ?? "Platform Admin"

async function main() {
  const hashedPassword = await hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
    },
  })

  console.log(JSON.stringify(user, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
