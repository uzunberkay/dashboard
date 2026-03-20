import type { AdminActivityEvent, AdminSavedViewScope, AdminUserRole } from "@/types/admin"

export function formatAdminRole(role: AdminUserRole) {
  return role === "ADMIN" ? "Yonetici" : "Kullanici"
}

export function formatAdminActivityEvent(event: AdminActivityEvent) {
  switch (event) {
    case "LOGIN":
      return "Giris"
    case "USER_CREATED":
      return "Kullanici olustu"
    case "USER_STATUS_CHANGED":
      return "Durum degisti"
    case "USER_ROLE_CHANGED":
      return "Rol degisti"
    case "BULK_USER_UPDATED":
      return "Toplu kullanici islemi"
    case "ADMIN_SETTINGS_UPDATED":
      return "Admin ayari degisti"
    case "ADMIN_EXPORT_CREATED":
      return "Export olusturuldu"
    case "SAVED_VIEW_CREATED":
      return "Gorunum kaydedildi"
    case "SAVED_VIEW_UPDATED":
      return "Gorunum guncellendi"
    case "SAVED_VIEW_DELETED":
      return "Gorunum silindi"
    default:
      return event
  }
}

export function formatAdminScope(scope: AdminSavedViewScope) {
  switch (scope) {
    case "DASHBOARD":
      return "Dashboard"
    case "ACTIVITY":
      return "Aktivite"
    case "USERS":
      return "Kullanicilar"
    default:
      return scope
  }
}
