import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import type { AdminPermission, AdminStaffRole } from "@/types/admin"
import { authOptions } from "@/lib/auth"
import { forbidden, unauthorized } from "@/lib/get-session"
import {
  getAdminHomePath,
  getPermissionsForRole,
  hasAdminAccess,
  hasPermission,
} from "@/lib/admin/permissions"
import { prisma } from "@/lib/prisma"

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  sessionVersion: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect

export type AdminGuardUser = Prisma.UserGetPayload<{
  select: typeof adminUserSelect
}> & {
  role: AdminStaffRole
}

async function getGuardedAdminUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { session: null, user: null as AdminGuardUser | null }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: adminUserSelect,
  })

  if (!user?.isActive || !hasAdminAccess(user.role)) {
    return { session, user: null as AdminGuardUser | null }
  }

  return {
    session,
    user: {
      ...user,
      role: user.role,
    } as AdminGuardUser,
  }
}

function hasRequiredPermission(
  role: string | null | undefined,
  permission?: AdminPermission | AdminPermission[]
) {
  if (!permission) {
    return true
  }

  return hasPermission(role, permission)
}

export async function requireAdminPageSession(permission?: AdminPermission | AdminPermission[]) {
  const { session, user } = await getGuardedAdminUser()

  if (!session?.user?.id || !user) {
    redirect("/login")
  }

  if (!hasRequiredPermission(user.role, permission)) {
    redirect(getAdminHomePath(user.role))
  }

  return {
    session,
    admin: user,
    permissions: getPermissionsForRole(user.role),
  }
}

export async function requireAdminApiSession(permission?: AdminPermission | AdminPermission[]) {
  const { session, user } = await getGuardedAdminUser()

  if (!session?.user?.id || !user) {
    return { response: unauthorized() }
  }

  if (!hasRequiredPermission(user.role, permission)) {
    return { response: forbidden() }
  }

  return {
    session,
    admin: user,
    permissions: getPermissionsForRole(user.role),
  }
}
