import type {
  AdminPermission,
  AdminSavedViewScope,
  AdminStaffRole,
  AdminUserRole,
} from "@/types/admin"

export const ADMIN_STAFF_ROLES = [
  "SUPPORT",
  "ANALYST",
  "OPS_ADMIN",
  "SUPER_ADMIN",
] as const satisfies readonly AdminStaffRole[]

const ROLE_PERMISSIONS: Record<AdminStaffRole, AdminPermission[]> = {
  SUPPORT: [
    "users:view",
    "users:detail:masked",
    "users:notes:create",
    "savedViews:manage",
  ],
  ANALYST: [
    "dashboard:view",
    "reports:view",
    "reports:export:aggregate",
    "savedViews:manage",
  ],
  OPS_ADMIN: [
    "dashboard:view",
    "users:view",
    "users:detail:full",
    "users:notes:create",
    "users:sessions:revoke",
    "users:request:user-ops",
    "users:bulk:update",
    "activity:view",
    "reports:view",
    "reports:export:aggregate",
    "reports:export:activity",
    "savedViews:manage",
    "system:view",
    "system:jobs:run",
    "approvals:view",
    "approvals:approve:user-ops",
    "users:raw-export:request",
  ],
  SUPER_ADMIN: [
    "dashboard:view",
    "users:view",
    "users:detail:full",
    "users:notes:create",
    "users:sessions:revoke",
    "users:request:user-ops",
    "users:manage:staff",
    "users:bulk:update",
    "activity:view",
    "reports:view",
    "reports:export:aggregate",
    "reports:export:activity",
    "savedViews:manage",
    "system:view",
    "system:jobs:run",
    "settings:view",
    "settings:request:update",
    "approvals:view",
    "approvals:approve:user-ops",
    "approvals:approve:sensitive",
    "users:raw-export:request",
  ],
}

export function hasAdminAccess(role: string | null | undefined): role is AdminStaffRole {
  return Boolean(role && ADMIN_STAFF_ROLES.includes(role as AdminStaffRole))
}

export function isStaffRole(role: AdminUserRole): role is AdminStaffRole {
  return hasAdminAccess(role)
}

export function getPermissionsForRole(role: string | null | undefined): AdminPermission[] {
  if (!hasAdminAccess(role)) {
    return []
  }

  return ROLE_PERMISSIONS[role]
}

export function hasPermission(
  role: string | null | undefined,
  permission: AdminPermission | AdminPermission[]
) {
  const permissions = getPermissionsForRole(role)
  const expected = Array.isArray(permission) ? permission : [permission]

  return expected.every((item) => permissions.includes(item))
}

export function getAdminHomePath(role: string | null | undefined) {
  if (hasPermission(role, "dashboard:view")) {
    return "/admin"
  }

  if (hasPermission(role, "users:view")) {
    return "/admin/users"
  }

  if (hasPermission(role, "reports:view")) {
    return "/admin/reports"
  }

  if (hasPermission(role, "activity:view")) {
    return "/admin/activity"
  }

  if (hasPermission(role, "system:view")) {
    return "/admin/system"
  }

  if (hasPermission(role, "settings:view")) {
    return "/admin/settings"
  }

  if (hasPermission(role, "approvals:view")) {
    return "/admin/approvals"
  }

  return "/"
}

export function canAccessSavedViewScope(role: string | null | undefined, scope: AdminSavedViewScope) {
  switch (scope) {
    case "DASHBOARD":
      return hasPermission(role, "dashboard:view")
    case "ACTIVITY":
      return hasPermission(role, "activity:view")
    case "USERS":
      return hasPermission(role, "users:view")
    default:
      return false
  }
}

export function canViewMaskedUserDetail(role: string | null | undefined) {
  return hasPermission(role, "users:detail:masked") || hasPermission(role, "users:detail:full")
}

export function canViewFullUserDetail(role: string | null | undefined) {
  return hasPermission(role, "users:detail:full")
}

export function getManageableRolesForActor(role: string | null | undefined): AdminUserRole[] {
  if (!hasPermission(role, "users:manage:staff")) {
    return ["USER"]
  }

  return ["USER", "SUPPORT", "ANALYST", "OPS_ADMIN", "SUPER_ADMIN"]
}
