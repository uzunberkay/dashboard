import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const email = process.argv[2]

async function main() {
  if (!email) {
    throw new Error("Usage: npx tsx scripts/grant-admin.ts <email>")
  }

  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN", isActive: true },
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
