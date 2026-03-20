import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { forbidden, unauthorized } from "@/lib/get-session"
import { prisma } from "@/lib/prisma"

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect

export type AdminGuardUser = Prisma.UserGetPayload<{
  select: typeof adminUserSelect
}>

async function getGuardedAdminUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { session: null, user: null as AdminGuardUser | null }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: adminUserSelect,
  })

  return { session, user }
}

export async function requireAdminPageSession() {
  const { session, user } = await getGuardedAdminUser()

  if (!session?.user?.id || !user?.isActive) {
    redirect("/login")
  }

  if (user.role !== "ADMIN") {
    redirect("/")
  }

  return {
    session,
    admin: user,
  }
}

export async function requireAdminApiSession() {
  const { session, user } = await getGuardedAdminUser()

  if (!session?.user?.id || !user?.isActive) {
    return { response: unauthorized() }
  }

  if (user.role !== "ADMIN") {
    return { response: forbidden() }
  }

  return {
    session,
    admin: user,
  }
}
