import type { AdminSavedViewScope } from "@/types/admin"

export function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function cleanFilterRecord(record: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== "")
  ) as Record<string, string>
}

export function buildQueryString(record: Record<string, string | undefined>) {
  return new URLSearchParams(cleanFilterRecord(record)).toString()
}

export function getAdminScopePath(scope: AdminSavedViewScope) {
  switch (scope) {
    case "DASHBOARD":
      return "/admin"
    case "ACTIVITY":
      return "/admin/activity"
    case "USERS":
      return "/admin/users"
    default:
      return "/admin"
  }
}

export function buildAdminSavedViewHref(scope: AdminSavedViewScope, filters: Record<string, string>) {
  const query = buildQueryString(filters)
  const pathname = getAdminScopePath(scope)
  return query ? `${pathname}?${query}` : pathname
}
