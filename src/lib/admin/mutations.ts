import {
  ActivityLogEvent,
  AdminSavedViewScope,
  type AdminSettingKey,
  type Prisma,
  type UserRole,
} from "@prisma/client"
import { revalidateTag } from "next/cache"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { createActivityLog } from "@/lib/admin/activity"
import { clearAdminRuntimeCache } from "@/lib/admin/runtime-cache"
import { prisma } from "@/lib/prisma"
import type {
  AdminSavedViewSummary,
  AdminSettingValueMap,
} from "@/types/admin"
import { buildAdminSavedViewHref } from "@/lib/admin/query"

type UpdateManagedUserInput = {
  actorUserId: string
  targetUserId: string
  role?: UserRole
  isActive?: boolean
  ipAddress?: string | null
  userAgent?: string | null
  skipRevalidate?: boolean
}

type UpdateManagedUserResult =
  | {
      ok: true
      user: {
        id: string
        name: string
        email: string
        role: UserRole
        isActive: boolean
      }
    }
  | {
      ok: false
      code: "not_found" | "self_protected" | "last_active_admin"
      message: string
    }

type AdminSettingsMutationInput = {
  actorUserId: string
  values: Partial<AdminSettingValueMap>
  ipAddress?: string | null
  userAgent?: string | null
}

type AdminSavedViewCreateInput = {
  actorUserId: string
  scope: AdminSavedViewScope
  name: string
  filters: Record<string, string>
  isDefault: boolean
  ipAddress?: string | null
  userAgent?: string | null
}

type AdminSavedViewUpdateInput = {
  actorUserId: string
  id: string
  name?: string
  filters?: Record<string, string>
  isDefault?: boolean
  ipAddress?: string | null
  userAgent?: string | null
}

type AdminSavedViewDeleteInput = {
  actorUserId: string
  id: string
  ipAddress?: string | null
  userAgent?: string | null
}

export function revalidateAdminState() {
  clearAdminRuntimeCache()
  revalidateTag(CACHE_TAGS.adminDashboard, "max")
  revalidateTag(CACHE_TAGS.adminUsers, "max")
  revalidateTag(CACHE_TAGS.adminSettings, "max")
  revalidateTag(CACHE_TAGS.adminSystem, "max")
  revalidateTag(CACHE_TAGS.activityLogs, "max")
  revalidateTag(CACHE_TAGS.adminActivity, "max")
  revalidateTag(CACHE_TAGS.adminSavedViews, "max")
}

async function ensureAnotherActiveAdminExists() {
  const activeAdminCount = await prisma.user.count({
    where: {
      role: "ADMIN",
      isActive: true,
    },
  })

  return activeAdminCount > 1
}

async function unsetOtherDefaultViews(scope: AdminSavedViewScope, excludedId?: string) {
  await prisma.adminSavedView.updateMany({
    where: {
      scope,
      isDefault: true,
      ...(excludedId ? { id: { not: excludedId } } : {}),
    },
    data: {
      isDefault: false,
    },
  })
}

function serializeSavedView(
  view: {
    id: string
    scope: AdminSavedViewScope
    name: string
    filtersJson: Prisma.JsonValue
    isDefault: boolean
    createdAt: Date
    updatedAt: Date
    createdByUser: {
      name: string
      email: string
    } | null
  }
): AdminSavedViewSummary {
  const filters =
    view.filtersJson && typeof view.filtersJson === "object" && !Array.isArray(view.filtersJson)
      ? Object.fromEntries(
          Object.entries(view.filtersJson).flatMap(([key, value]) =>
            typeof value === "string" && value.length > 0 ? [[key, value]] : []
          )
        )
      : {}

  return {
    id: view.id,
    scope: view.scope,
    name: view.name,
    isDefault: view.isDefault,
    filters,
    href: buildAdminSavedViewHref(view.scope, filters),
    createdAt: view.createdAt.toISOString(),
    updatedAt: view.updatedAt.toISOString(),
    createdByName: view.createdByUser?.name || view.createdByUser?.email || "Sistem",
    createdByEmail: view.createdByUser?.email ?? null,
  }
}

export async function updateManagedUser({
  actorUserId,
  targetUserId,
  role,
  isActive,
  ipAddress,
  userAgent,
  skipRevalidate = false,
}: UpdateManagedUserInput): Promise<UpdateManagedUserResult> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  })

  if (!targetUser) {
    return {
      ok: false,
      code: "not_found",
      message: "Kullanici bulunamadi",
    }
  }

  const nextRole = role ?? targetUser.role
  const nextIsActive = isActive ?? targetUser.isActive

  if (
    actorUserId === targetUserId &&
    ((role !== undefined && nextRole !== targetUser.role) || (isActive !== undefined && nextIsActive !== targetUser.isActive))
  ) {
    if (nextRole !== "ADMIN" || nextIsActive === false) {
      return {
        ok: false,
        code: "self_protected",
        message: "Kendi yonetici erisiminizi dusuremezsiniz",
      }
    }
  }

  const losesActiveAdminAccess =
    targetUser.role === "ADMIN" &&
    targetUser.isActive &&
    (nextRole !== "ADMIN" || nextIsActive === false)

  if (losesActiveAdminAccess) {
    const hasBackupAdmin = await ensureAnotherActiveAdminExists()
    if (!hasBackupAdmin) {
      return {
        ok: false,
        code: "last_active_admin",
        message: "Sistemde en az bir aktif admin kalmalidir",
      }
    }
  }

  const shouldUpdateRole = role !== undefined && role !== targetUser.role
  const shouldUpdateStatus = isActive !== undefined && isActive !== targetUser.isActive

  if (!shouldUpdateRole && !shouldUpdateStatus) {
    return {
      ok: true,
      user: targetUser,
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      ...(shouldUpdateRole ? { role } : {}),
      ...(shouldUpdateStatus ? { isActive } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  })

  if (shouldUpdateRole) {
    await createActivityLog({
      event: ActivityLogEvent.USER_ROLE_CHANGED,
      actorUserId,
      targetUserId,
      metadata: {
        previousRole: targetUser.role,
        nextRole: updatedUser.role,
      },
      ipAddress,
      userAgent,
    })
  }

  if (shouldUpdateStatus) {
    await createActivityLog({
      event: ActivityLogEvent.USER_STATUS_CHANGED,
      actorUserId,
      targetUserId,
      metadata: {
        previousStatus: targetUser.isActive ? "active" : "inactive",
        nextStatus: updatedUser.isActive ? "active" : "inactive",
      },
      ipAddress,
      userAgent,
    })
  }

  if (!skipRevalidate) {
    revalidateAdminState()
  }

  return {
    ok: true,
    user: updatedUser,
  }
}

export async function createBulkUserUpdateActivity(input: {
  actorUserId: string
  action: string
  userIds: string[]
  updatedCount: number
  skipped: string[]
  ipAddress?: string | null
  userAgent?: string | null
}) {
  await createActivityLog({
    event: ActivityLogEvent.BULK_USER_UPDATED,
    actorUserId: input.actorUserId,
    metadata: {
      action: input.action,
      updatedCount: input.updatedCount,
      skipped: input.skipped,
      userIds: input.userIds,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })
}

export async function updateAdminSettings({
  actorUserId,
  values,
  ipAddress,
  userAgent,
}: AdminSettingsMutationInput) {
  const entries = Object.entries(values) as Array<[AdminSettingKey, AdminSettingValueMap[keyof AdminSettingValueMap]]>

  await prisma.$transaction(async (tx) => {
    for (const [key, value] of entries) {
      await tx.adminSetting.upsert({
        where: { key },
        update: {
          valueJson: value as Prisma.InputJsonValue,
          updatedByUserId: actorUserId,
        },
        create: {
          key,
          valueJson: value as Prisma.InputJsonValue,
          updatedByUserId: actorUserId,
        },
      })
    }
  })

  await createActivityLog({
    event: ActivityLogEvent.ADMIN_SETTINGS_UPDATED,
    actorUserId,
    metadata: {
      updatedKeys: entries.map(([key]) => key),
      values,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()
}

export async function createAdminSavedView({
  actorUserId,
  scope,
  name,
  filters,
  isDefault,
  ipAddress,
  userAgent,
}: AdminSavedViewCreateInput) {
  if (isDefault) {
    await unsetOtherDefaultViews(scope)
  }

  const savedView = await prisma.adminSavedView.create({
    data: {
      scope,
      name,
      filtersJson: filters,
      isDefault,
      createdByUserId: actorUserId,
    },
    include: {
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  await createActivityLog({
    event: ActivityLogEvent.SAVED_VIEW_CREATED,
    actorUserId,
    metadata: {
      scope,
      name,
      filters,
      isDefault,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()

  return serializeSavedView(savedView)
}

export async function updateAdminSavedView({
  actorUserId,
  id,
  name,
  filters,
  isDefault,
  ipAddress,
  userAgent,
}: AdminSavedViewUpdateInput) {
  const existing = await prisma.adminSavedView.findUnique({
    where: { id },
  })

  if (!existing) {
    return null
  }

  const nextIsDefault = isDefault ?? existing.isDefault

  if (nextIsDefault) {
    await unsetOtherDefaultViews(existing.scope, id)
  }

  const savedView = await prisma.adminSavedView.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(filters !== undefined ? { filtersJson: filters } : {}),
      ...(isDefault !== undefined ? { isDefault } : {}),
    },
    include: {
      createdByUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  await createActivityLog({
    event: ActivityLogEvent.SAVED_VIEW_UPDATED,
    actorUserId,
    metadata: {
      id,
      scope: savedView.scope,
      name: savedView.name,
      filters,
      isDefault,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()

  return serializeSavedView(savedView)
}

export async function deleteAdminSavedView({
  actorUserId,
  id,
  ipAddress,
  userAgent,
}: AdminSavedViewDeleteInput) {
  const existing = await prisma.adminSavedView.findUnique({
    where: { id },
  })

  if (!existing) {
    return false
  }

  await prisma.adminSavedView.delete({
    where: { id },
  })

  await createActivityLog({
    event: ActivityLogEvent.SAVED_VIEW_DELETED,
    actorUserId,
    metadata: {
      id,
      scope: existing.scope,
      name: existing.name,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()
  return true
}
