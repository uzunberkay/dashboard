import { randomBytes } from "crypto"
import {
  ActivityLogEvent,
  AdminApprovalRequestStatus,
  Prisma,
  type AdminSettingKey,
  type PrismaClient,
  type UserRole,
} from "@prisma/client"
import { revalidateTag } from "next/cache"
import { CACHE_TAGS } from "@/lib/cache-tags"
import { clearAdminRuntimeCache } from "@/lib/admin/runtime-cache"
import { isStaffRole } from "@/lib/admin/permissions"
import { prisma } from "@/lib/prisma"
import type {
  AdminSavedViewSummary,
  AdminSettingValueMap,
  AdminStaffRole,
  AdminUserRole,
} from "@/types/admin"
import { buildAdminSavedViewHref } from "@/lib/admin/query"

type ActivityLogWriter = PrismaClient | Prisma.TransactionClient

type AdminRequestActor = {
  id: string
  role: AdminStaffRole
}

type AdminMutationContext = {
  actorUserId: string
  ipAddress?: string | null
  userAgent?: string | null
}

type AdminSettingsMutationInput = {
  actor: AdminRequestActor
  values: Partial<AdminSettingValueMap>
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

type AdminSavedViewCreateInput = {
  actorUserId: string
  scope: "DASHBOARD" | "ACTIVITY" | "USERS"
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

type RequestManagedUserUpdateInput = {
  actor: AdminRequestActor
  targetUserId: string
  role?: UserRole
  isActive?: boolean
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

type RequestBulkUserUpdateInput = {
  actor: AdminRequestActor
  userIds: string[]
  action: "enable" | "disable"
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

type RequestRawUserExportInput = {
  actor: AdminRequestActor
  targetUserId: string
  reason: string
  ipAddress?: string | null
  userAgent?: string | null
}

type ApprovalDecisionInput = {
  actor: AdminRequestActor
  requestId: string
  reason?: string
  ipAddress?: string | null
  userAgent?: string | null
}

type CreateUserNoteInput = {
  actorUserId: string
  targetUserId: string
  body: string
  ipAddress?: string | null
  userAgent?: string | null
}

type RevokeUserSessionsInput = {
  actor: AdminRequestActor
  targetUserId: string
  ipAddress?: string | null
  userAgent?: string | null
}

type RawExportDownloadInput = {
  actorUserId: string
  requestId: string
  token: string
  ipAddress?: string | null
  userAgent?: string | null
}

type UserAccountUpdatePayload = {
  role: UserRole | null
  isActive: boolean | null
  currentRole: UserRole
  currentIsActive: boolean
  nextRole: UserRole
  nextIsActive: boolean
}

type BulkUserAccountUpdatePayload = {
  action: "enable" | "disable"
  userIds: string[]
  nextIsActive: boolean
}

type AdminSettingsUpdatePayload = {
  values: Partial<AdminSettingValueMap>
}

type RawUserExportPayload = {
  userId: string
}

type ApprovalPayload =
  | UserAccountUpdatePayload
  | BulkUserAccountUpdatePayload
  | AdminSettingsUpdatePayload
  | RawUserExportPayload

type ApprovalRequestMutationResult =
  | {
      ok: true
      mode: "approval_requested"
      requestId: string
      message: string
    }
  | {
      ok: true
      mode: "completed"
      message: string
    }
  | {
      ok: false
      code:
        | "not_found"
        | "permission_denied"
        | "self_protected"
        | "last_super_admin"
        | "invalid_target"
        | "already_processed"
        | "approval_denied"
        | "download_unavailable"
      message: string
    }

function writeActivityLog(
  db: ActivityLogWriter,
  input: {
    event: ActivityLogEvent
    actorUserId?: string | null
    targetUserId?: string | null
    metadata?: Prisma.InputJsonValue
    ipAddress?: string | null
    userAgent?: string | null
  }
) {
  return db.activityLog.create({
    data: {
      event: input.event,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  })
}

function toInputJson(value: unknown) {
  return value as Prisma.InputJsonValue
}

function asJsonObject(value: Prisma.JsonValue) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {}
  }

  return value as Record<string, unknown>
}

function isSensitiveUserChange(currentRole: UserRole, nextRole: UserRole) {
  return isStaffRole(currentRole as AdminUserRole) || isStaffRole(nextRole as AdminUserRole)
}

function buildApprovalExpiryDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000)
}

function approvalRequested(message: string, requestId: string): ApprovalRequestMutationResult {
  return {
    ok: true,
    mode: "approval_requested",
    requestId,
    message,
  }
}

function completed(message: string): ApprovalRequestMutationResult {
  return {
    ok: true,
    mode: "completed",
    message,
  }
}

function failure(
  code:
    | "not_found"
    | "permission_denied"
    | "self_protected"
    | "last_super_admin"
    | "invalid_target"
    | "already_processed"
    | "approval_denied"
    | "download_unavailable",
  message: string
): ApprovalRequestMutationResult {
  return {
    ok: false,
    code,
    message,
  }
}

function buildApprovalMessage(actionType: "USER_ACCOUNT_UPDATE" | "BULK_USER_ACCOUNT_UPDATE" | "ADMIN_SETTINGS_UPDATE" | "RAW_USER_EXPORT") {
  switch (actionType) {
    case "USER_ACCOUNT_UPDATE":
      return "Kullanici degisikligi onay kuyruguna alindi."
    case "BULK_USER_ACCOUNT_UPDATE":
      return "Toplu kullanici islemi onay kuyruguna alindi."
    case "ADMIN_SETTINGS_UPDATE":
      return "Admin ayar guncellemesi onay kuyruguna alindi."
    case "RAW_USER_EXPORT":
      return "Ham export istegi onay kuyruguna alindi."
    default:
      return "Islem onay kuyruguna alindi."
  }
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
  revalidateTag(CACHE_TAGS.adminApprovals, "max")
  revalidateTag(CACHE_TAGS.adminUserNotes, "max")
}

async function ensureAnotherActiveSuperAdminExists(db: ActivityLogWriter) {
  const activeSuperAdminCount = await db.user.count({
    where: {
      role: "SUPER_ADMIN",
      isActive: true,
    },
  })

  return activeSuperAdminCount > 1
}

async function expirePendingApprovals(db: ActivityLogWriter) {
  await db.adminApprovalRequest.updateMany({
    where: {
      status: "PENDING",
      expiresAt: {
        lt: new Date(),
      },
    },
    data: {
      status: "EXPIRED",
      decidedAt: new Date(),
    },
  })
}

async function unsetOtherDefaultViews(scope: "DASHBOARD" | "ACTIVITY" | "USERS", excludedId?: string) {
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
    scope: "DASHBOARD" | "ACTIVITY" | "USERS"
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

async function createApprovalRequest(input: {
  actionType: "USER_ACCOUNT_UPDATE" | "BULK_USER_ACCOUNT_UPDATE" | "ADMIN_SETTINGS_UPDATE" | "RAW_USER_EXPORT"
  payload: ApprovalPayload
  reason: string
  targetUserId?: string | null
  actor: AdminRequestActor
  ipAddress?: string | null
  userAgent?: string | null
}) {
  await expirePendingApprovals(prisma)

  const request = await prisma.adminApprovalRequest.create({
    data: {
      actionType: input.actionType,
      status: AdminApprovalRequestStatus.PENDING,
      payloadJson: toInputJson(input.payload),
      reason: input.reason,
      targetUserId: input.targetUserId ?? null,
      requestedByUserId: input.actor.id,
      expiresAt: buildApprovalExpiryDate(),
    },
  })

  await writeActivityLog(prisma, {
    event: ActivityLogEvent.APPROVAL_REQUESTED,
    actorUserId: input.actor.id,
    targetUserId: input.targetUserId ?? null,
    metadata: {
      requestId: request.id,
      actionType: input.actionType,
      reason: input.reason,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  if (input.actionType === "RAW_USER_EXPORT") {
    await writeActivityLog(prisma, {
      event: ActivityLogEvent.RAW_EXPORT_REQUESTED,
      actorUserId: input.actor.id,
      targetUserId: input.targetUserId ?? null,
      metadata: {
        requestId: request.id,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    })
  }

  revalidateAdminState()

  return request
}

function getUserUpdatePayload(payloadJson: Prisma.JsonValue) {
  const payload = asJsonObject(payloadJson)
  const nextRole = payload.nextRole
  const currentRole = payload.currentRole

  if (
    typeof currentRole !== "string" ||
    typeof nextRole !== "string" ||
    typeof payload.currentIsActive !== "boolean" ||
    typeof payload.nextIsActive !== "boolean"
  ) {
    return null
  }

  return {
    role: typeof payload.role === "string" ? (payload.role as UserRole) : null,
    isActive: typeof payload.isActive === "boolean" ? payload.isActive : null,
    currentRole: currentRole as UserRole,
    currentIsActive: payload.currentIsActive,
    nextRole: nextRole as UserRole,
    nextIsActive: payload.nextIsActive,
  } satisfies UserAccountUpdatePayload
}

function getBulkUserUpdatePayload(payloadJson: Prisma.JsonValue) {
  const payload = asJsonObject(payloadJson)
  if (
    (payload.action !== "enable" && payload.action !== "disable") ||
    typeof payload.nextIsActive !== "boolean" ||
    !Array.isArray(payload.userIds)
  ) {
    return null
  }

  return {
    action: payload.action,
    nextIsActive: payload.nextIsActive,
    userIds: payload.userIds.filter((value): value is string => typeof value === "string"),
  } satisfies BulkUserAccountUpdatePayload
}

function getSettingsUpdatePayload(payloadJson: Prisma.JsonValue) {
  const payload = asJsonObject(payloadJson)
  const values = payload.values
  if (!values || Array.isArray(values) || typeof values !== "object") {
    return null
  }

  return {
    values: values as Partial<AdminSettingValueMap>,
  } satisfies AdminSettingsUpdatePayload
}

function canActorApproveRequest(
  actorRole: AdminStaffRole,
  request: {
    requestedByUserId: string
    actionType: "USER_ACCOUNT_UPDATE" | "BULK_USER_ACCOUNT_UPDATE" | "ADMIN_SETTINGS_UPDATE" | "RAW_USER_EXPORT"
    payloadJson: Prisma.JsonValue
  }
) {
  if (request.actionType === "ADMIN_SETTINGS_UPDATE" || request.actionType === "RAW_USER_EXPORT") {
    return actorRole === "SUPER_ADMIN"
  }

  if (request.actionType === "BULK_USER_ACCOUNT_UPDATE") {
    return actorRole === "SUPER_ADMIN" || actorRole === "OPS_ADMIN"
  }

  const payload = getUserUpdatePayload(request.payloadJson)
  if (!payload) {
    return false
  }

  if (isSensitiveUserChange(payload.currentRole, payload.nextRole)) {
    return actorRole === "SUPER_ADMIN"
  }

  return actorRole === "SUPER_ADMIN" || actorRole === "OPS_ADMIN"
}

async function applyUserAccountUpdate(
  tx: Prisma.TransactionClient,
  request: {
    id: string
    requestedByUserId: string
    targetUserId: string | null
    payloadJson: Prisma.JsonValue
  },
  actorUserId: string,
  context: AdminMutationContext
) {
  const payload = getUserUpdatePayload(request.payloadJson)

  if (!request.targetUserId || !payload) {
    throw new Error("Invalid approval payload")
  }

  const targetUser = await tx.user.findUnique({
    where: { id: request.targetUserId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  })

  if (!targetUser) {
    throw new Error("Target user not found")
  }

  if (
    targetUser.role === "SUPER_ADMIN" &&
    targetUser.isActive &&
    (payload.nextRole !== "SUPER_ADMIN" || payload.nextIsActive === false)
  ) {
    const hasBackup = await ensureAnotherActiveSuperAdminExists(tx)
    if (!hasBackup) {
      throw new Error("Sistemde en az bir aktif super admin kalmalidir")
    }
  }

  const updatedUser = await tx.user.update({
    where: { id: request.targetUserId },
    data: {
      ...(payload.role !== null ? { role: payload.role } : {}),
      ...(payload.isActive !== null ? { isActive: payload.isActive } : {}),
      ...(payload.isActive === false ? { sessionVersion: { increment: 1 } } : {}),
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  })

  if (payload.currentRole !== updatedUser.role) {
    await writeActivityLog(tx, {
      event: ActivityLogEvent.USER_ROLE_CHANGED,
      actorUserId,
      targetUserId: request.targetUserId,
      metadata: {
        requestId: request.id,
        requestedByUserId: request.requestedByUserId,
        previousRole: payload.currentRole,
        nextRole: updatedUser.role,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  if (payload.currentIsActive !== updatedUser.isActive) {
    await writeActivityLog(tx, {
      event: ActivityLogEvent.USER_STATUS_CHANGED,
      actorUserId,
      targetUserId: request.targetUserId,
      metadata: {
        requestId: request.id,
        requestedByUserId: request.requestedByUserId,
        previousStatus: payload.currentIsActive ? "active" : "inactive",
        nextStatus: updatedUser.isActive ? "active" : "inactive",
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }
}

async function applyBulkUserUpdate(
  tx: Prisma.TransactionClient,
  request: {
    id: string
    requestedByUserId: string
    payloadJson: Prisma.JsonValue
  },
  actorUserId: string,
  context: AdminMutationContext
) {
  const payload = getBulkUserUpdatePayload(request.payloadJson)

  if (!payload) {
    throw new Error("Invalid bulk approval payload")
  }

  const uniqueUserIds = [...new Set(payload.userIds)]
  const users = await tx.user.findMany({
    where: {
      id: {
        in: uniqueUserIds,
      },
    },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  })

  const updatedUserIds: string[] = []
  for (const user of users) {
    if (user.role !== "USER" || user.isActive === payload.nextIsActive) {
      continue
    }

    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        isActive: payload.nextIsActive,
        ...(payload.nextIsActive ? {} : { sessionVersion: { increment: 1 } }),
      },
      select: {
        id: true,
        isActive: true,
      },
    })

    updatedUserIds.push(updated.id)

    await writeActivityLog(tx, {
      event: ActivityLogEvent.USER_STATUS_CHANGED,
      actorUserId,
      targetUserId: updated.id,
      metadata: {
        requestId: request.id,
        requestedByUserId: request.requestedByUserId,
        previousStatus: user.isActive ? "active" : "inactive",
        nextStatus: updated.isActive ? "active" : "inactive",
        source: "bulk",
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    })
  }

  await writeActivityLog(tx, {
    event: ActivityLogEvent.BULK_USER_UPDATED,
    actorUserId,
    metadata: {
      requestId: request.id,
      requestedByUserId: request.requestedByUserId,
      action: payload.action,
      updatedUserIds,
      requestedUserIds: uniqueUserIds,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

async function applyAdminSettingsUpdate(
  tx: Prisma.TransactionClient,
  request: {
    id: string
    requestedByUserId: string
    payloadJson: Prisma.JsonValue
  },
  actorUserId: string,
  context: AdminMutationContext
) {
  const payload = getSettingsUpdatePayload(request.payloadJson)

  if (!payload) {
    throw new Error("Invalid settings approval payload")
  }

  const entries = Object.entries(payload.values) as Array<
    [AdminSettingKey, AdminSettingValueMap[keyof AdminSettingValueMap]]
  >

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

  await writeActivityLog(tx, {
    event: ActivityLogEvent.ADMIN_SETTINGS_UPDATED,
    actorUserId,
    metadata: {
      requestId: request.id,
      requestedByUserId: request.requestedByUserId,
      updatedKeys: entries.map(([key]) => key),
      values: payload.values,
    },
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  })
}

export async function requestManagedUserUpdate({
  actor,
  targetUserId,
  role,
  isActive,
  reason,
  ipAddress,
  userAgent,
}: RequestManagedUserUpdateInput): Promise<ApprovalRequestMutationResult> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      isActive: true,
    },
  })

  if (!targetUser) {
    return failure("not_found", "Kullanici bulunamadi")
  }

  const nextRole = role ?? targetUser.role
  const nextIsActive = isActive ?? targetUser.isActive

  if (nextRole === targetUser.role && nextIsActive === targetUser.isActive) {
    return failure("invalid_target", "Degisiklik icin yeni bir deger secin")
  }

  if (actor.id === targetUserId) {
    return failure("self_protected", "Kendi hesap durumunuz icin onay istegi olusturamazsiniz")
  }

  const isSensitive = isSensitiveUserChange(targetUser.role, nextRole)

  if (isSensitive && actor.role !== "SUPER_ADMIN") {
    return failure("permission_denied", "Staff hesaplarinda rol veya durum degisikligi isteme yetkiniz yok")
  }

  if (!isSensitive && actor.role !== "SUPER_ADMIN" && actor.role !== "OPS_ADMIN") {
    return failure("permission_denied", "Bu kullanici icin hesap degisikligi isteme yetkiniz yok")
  }

  if (
    targetUser.role === "SUPER_ADMIN" &&
    targetUser.isActive &&
    (nextRole !== "SUPER_ADMIN" || nextIsActive === false)
  ) {
    const hasBackup = await ensureAnotherActiveSuperAdminExists(prisma)
    if (!hasBackup) {
      return failure("last_super_admin", "Sistemde en az bir aktif super admin kalmalidir")
    }
  }

  const request = await createApprovalRequest({
    actionType: "USER_ACCOUNT_UPDATE",
    payload: {
      role: role ?? null,
      isActive: isActive ?? null,
      currentRole: targetUser.role,
      currentIsActive: targetUser.isActive,
      nextRole,
      nextIsActive,
    },
    reason,
    targetUserId,
    actor,
    ipAddress,
    userAgent,
  })

  return approvalRequested(buildApprovalMessage("USER_ACCOUNT_UPDATE"), request.id)
}

export async function requestBulkUserUpdate({
  actor,
  userIds,
  action,
  reason,
  ipAddress,
  userAgent,
}: RequestBulkUserUpdateInput): Promise<ApprovalRequestMutationResult> {
  const uniqueUserIds = [...new Set(userIds)]
  if (uniqueUserIds.length === 0) {
    return failure("invalid_target", "En az bir kullanici secin")
  }

  if (actor.role !== "OPS_ADMIN" && actor.role !== "SUPER_ADMIN") {
    return failure("permission_denied", "Toplu hesap islemi isteme yetkiniz yok")
  }

  const targetedUsers = await prisma.user.findMany({
    where: {
      id: {
        in: uniqueUserIds,
      },
    },
    select: {
      id: true,
      role: true,
    },
  })

  if (targetedUsers.length === 0) {
    return failure("not_found", "Secili kullanicilar bulunamadi")
  }

  if (targetedUsers.some((user) => user.id === actor.id || user.role !== "USER")) {
    return failure("invalid_target", "Toplu islem yalnizca standart kullanici hesaplarinda uygulanabilir")
  }

  const request = await createApprovalRequest({
    actionType: "BULK_USER_ACCOUNT_UPDATE",
    payload: {
      action,
      userIds: uniqueUserIds,
      nextIsActive: action === "enable",
    },
    reason,
    actor,
    ipAddress,
    userAgent,
  })

  return approvalRequested(buildApprovalMessage("BULK_USER_ACCOUNT_UPDATE"), request.id)
}

export async function requestAdminSettingsUpdate({
  actor,
  values,
  reason,
  ipAddress,
  userAgent,
}: AdminSettingsMutationInput): Promise<ApprovalRequestMutationResult> {
  if (actor.role !== "SUPER_ADMIN") {
    return failure("permission_denied", "Admin ayari guncelleme istegi olusturma yetkiniz yok")
  }

  const request = await createApprovalRequest({
    actionType: "ADMIN_SETTINGS_UPDATE",
    payload: {
      values,
    },
    reason,
    actor,
    ipAddress,
    userAgent,
  })

  return approvalRequested(buildApprovalMessage("ADMIN_SETTINGS_UPDATE"), request.id)
}

export async function requestRawUserExport({
  actor,
  targetUserId,
  reason,
  ipAddress,
  userAgent,
}: RequestRawUserExportInput): Promise<ApprovalRequestMutationResult> {
  if (actor.role !== "OPS_ADMIN" && actor.role !== "SUPER_ADMIN") {
    return failure("permission_denied", "Ham export isteme yetkiniz yok")
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
    },
  })

  if (!targetUser) {
    return failure("not_found", "Kullanici bulunamadi")
  }

  const request = await createApprovalRequest({
    actionType: "RAW_USER_EXPORT",
    payload: {
      userId: targetUser.id,
    },
    reason,
    targetUserId,
    actor,
    ipAddress,
    userAgent,
  })

  return approvalRequested(buildApprovalMessage("RAW_USER_EXPORT"), request.id)
}

export async function approveAdminApprovalRequest({
  actor,
  requestId,
  reason,
  ipAddress,
  userAgent,
}: ApprovalDecisionInput): Promise<ApprovalRequestMutationResult> {
  const existing = await prisma.adminApprovalRequest.findUnique({
    where: { id: requestId },
  })

  if (!existing) {
    return failure("not_found", "Onay istegi bulunamadi")
  }

  if (existing.status !== "PENDING" || existing.expiresAt < new Date()) {
    return failure("already_processed", "Bu onay istegi artik islenebilir degil")
  }

  if (existing.requestedByUserId === actor.id) {
    return failure("approval_denied", "Kendi isteginizi onaylayamazsiniz")
  }

  if (!canActorApproveRequest(actor.role, existing)) {
    return failure("permission_denied", "Bu onay istegini sonuclandirma yetkiniz yok")
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (existing.actionType === "USER_ACCOUNT_UPDATE") {
        await applyUserAccountUpdate(tx, existing, actor.id, { actorUserId: actor.id, ipAddress, userAgent })
      } else if (existing.actionType === "BULK_USER_ACCOUNT_UPDATE") {
        await applyBulkUserUpdate(tx, existing, actor.id, { actorUserId: actor.id, ipAddress, userAgent })
      } else if (existing.actionType === "ADMIN_SETTINGS_UPDATE") {
        await applyAdminSettingsUpdate(tx, existing, actor.id, { actorUserId: actor.id, ipAddress, userAgent })
      } else if (existing.actionType === "RAW_USER_EXPORT") {
        await tx.adminApprovalRequest.update({
          where: { id: existing.id },
          data: {
            fulfillmentToken: randomBytes(24).toString("hex"),
            fulfillmentExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        })
      }

      await tx.adminApprovalRequest.update({
        where: { id: existing.id },
        data: {
          status: "APPROVED",
          approvedByUserId: actor.id,
          decidedAt: new Date(),
          rejectionReason: null,
        },
      })

      await writeActivityLog(tx, {
        event: ActivityLogEvent.APPROVAL_APPROVED,
        actorUserId: actor.id,
        targetUserId: existing.targetUserId ?? null,
        metadata: {
          requestId: existing.id,
          actionType: existing.actionType,
          requestedByUserId: existing.requestedByUserId,
          approvalNote: reason ?? null,
        },
        ipAddress,
        userAgent,
      })
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onay uygulanamadi"
    return failure("invalid_target", message)
  }

  revalidateAdminState()
  return completed("Onay istegi uygulandi")
}

export async function rejectAdminApprovalRequest({
  actor,
  requestId,
  reason,
  ipAddress,
  userAgent,
}: ApprovalDecisionInput): Promise<ApprovalRequestMutationResult> {
  const existing = await prisma.adminApprovalRequest.findUnique({
    where: { id: requestId },
  })

  if (!existing) {
    return failure("not_found", "Onay istegi bulunamadi")
  }

  if (existing.status !== "PENDING" || existing.expiresAt < new Date()) {
    return failure("already_processed", "Bu onay istegi artik islenebilir degil")
  }

  if (existing.requestedByUserId === actor.id) {
    return failure("approval_denied", "Kendi isteginizi reddedemezsiniz")
  }

  if (!canActorApproveRequest(actor.role, existing)) {
    return failure("permission_denied", "Bu onay istegini sonuclandirma yetkiniz yok")
  }

  await prisma.adminApprovalRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      approvedByUserId: actor.id,
      decidedAt: new Date(),
      rejectionReason: reason ?? null,
    },
  })

  await writeActivityLog(prisma, {
    event: ActivityLogEvent.APPROVAL_REJECTED,
    actorUserId: actor.id,
    targetUserId: existing.targetUserId ?? null,
    metadata: {
      requestId: existing.id,
      actionType: existing.actionType,
      requestedByUserId: existing.requestedByUserId,
      rejectionReason: reason ?? null,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()
  return completed("Onay istegi reddedildi")
}

export async function createAdminUserNote({
  actorUserId,
  targetUserId,
  body,
  ipAddress,
  userAgent,
}: CreateUserNoteInput) {
  const note = await prisma.adminUserNote.create({
    data: {
      userId: targetUserId,
      authorUserId: actorUserId,
      body,
    },
    include: {
      authorUser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  await writeActivityLog(prisma, {
    event: ActivityLogEvent.USER_NOTE_CREATED,
    actorUserId,
    targetUserId,
    metadata: {
      noteId: note.id,
      preview: note.body.slice(0, 120),
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()

  return {
    id: note.id,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    authorName: note.authorUser?.name || note.authorUser?.email || "Sistem",
    authorEmail: note.authorUser?.email ?? null,
  }
}

export async function revokeManagedUserSessions({
  actor,
  targetUserId,
  ipAddress,
  userAgent,
}: RevokeUserSessionsInput): Promise<ApprovalRequestMutationResult> {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      sessionVersion: true,
    },
  })

  if (!targetUser) {
    return failure("not_found", "Kullanici bulunamadi")
  }

  if (isStaffRole(targetUser.role as AdminUserRole) && actor.role !== "SUPER_ADMIN") {
    return failure("permission_denied", "Staff hesaplarinin oturumlarini sonlandirma yetkiniz yok")
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      sessionVersion: {
        increment: 1,
      },
    },
  })

  await writeActivityLog(prisma, {
    event: ActivityLogEvent.USER_SESSIONS_REVOKED,
    actorUserId: actor.id,
    targetUserId,
    metadata: {
      previousSessionVersion: targetUser.sessionVersion,
      nextSessionVersion: targetUser.sessionVersion + 1,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()
  return completed("Kullanicinin mevcut oturumlari gecersiz kilindi")
}

export async function downloadApprovedRawUserExport({
  actorUserId,
  requestId,
  token,
  ipAddress,
  userAgent,
}: RawExportDownloadInput) {
  const request = await prisma.adminApprovalRequest.findUnique({
    where: { id: requestId },
    include: {
      targetUser: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          sessionVersion: true,
          createdAt: true,
          lastLoginAt: true,
        },
      },
    },
  })

  if (
    !request ||
    request.actionType !== "RAW_USER_EXPORT" ||
    request.status !== "APPROVED" ||
    request.requestedByUserId !== actorUserId ||
    !request.fulfillmentToken ||
    request.fulfillmentToken !== token ||
    !request.fulfillmentExpiresAt ||
    request.fulfillmentExpiresAt < new Date() ||
    request.fulfilledAt
  ) {
    return failure("download_unavailable", "Ham export baglantisi gecersiz veya suresi dolmus")
  }

  if (!request.targetUser) {
    return failure("not_found", "Export kullanicisi bulunamadi")
  }

  const userId = request.targetUser.id

  const [
    transactions,
    categories,
    goals,
    recurringRules,
    scheduledPayments,
    reminders,
    monthlyReports,
    notificationPreference,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.recurringRule.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.scheduledPayment.findMany({
      where: { userId },
      orderBy: { dueDate: "desc" },
    }),
    prisma.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.monthlyReport.findMany({
      where: { userId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.notificationPreference.findUnique({
      where: { userId },
    }),
  ])

  await prisma.adminApprovalRequest.update({
    where: { id: requestId },
    data: {
      fulfilledAt: new Date(),
    },
  })

  await writeActivityLog(prisma, {
    event: ActivityLogEvent.RAW_EXPORT_DOWNLOADED,
    actorUserId,
    targetUserId: userId,
    metadata: {
      requestId,
      transactionCount: transactions.length,
      categoryCount: categories.length,
      goalCount: goals.length,
      recurringRuleCount: recurringRules.length,
      scheduledPaymentCount: scheduledPayments.length,
      reminderCount: reminders.length,
      monthlyReportCount: monthlyReports.length,
    },
    ipAddress,
    userAgent,
  })

  revalidateAdminState()

  return {
    ok: true as const,
    filename: `${request.targetUser.email.replace(/[^a-zA-Z0-9._-]+/g, "-")}-raw-export.json`,
    content: {
      generatedAt: new Date().toISOString(),
      approvalRequestId: requestId,
      user: request.targetUser,
      notificationPreference,
      transactions,
      categories,
      goals,
      recurringRules,
      scheduledPayments,
      reminders,
      monthlyReports,
    },
  }
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

  await writeActivityLog(prisma, {
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

  if ((isDefault ?? existing.isDefault) === true) {
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

  await writeActivityLog(prisma, {
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

  await writeActivityLog(prisma, {
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
