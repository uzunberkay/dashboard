import type {
  AdminActivityEvent,
  AdminApprovalActionType,
  AdminApprovalRequestStatus,
  AdminSavedViewScope,
  AdminUserRole,
} from "@/types/admin"

export function formatAdminRole(role: AdminUserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin"
    case "OPS_ADMIN":
      return "Operasyon Admin"
    case "SUPPORT":
      return "Destek"
    case "ANALYST":
      return "Analist"
    case "USER":
      return "Kullanici"
    default:
      return role
  }
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
      return "Admin ayari uygulandi"
    case "ADMIN_EXPORT_CREATED":
      return "Export olusturuldu"
    case "SAVED_VIEW_CREATED":
      return "Gorunum kaydedildi"
    case "SAVED_VIEW_UPDATED":
      return "Gorunum guncellendi"
    case "SAVED_VIEW_DELETED":
      return "Gorunum silindi"
    case "APPROVAL_REQUESTED":
      return "Onay istendi"
    case "APPROVAL_APPROVED":
      return "Onaylandi"
    case "APPROVAL_REJECTED":
      return "Reddedildi"
    case "USER_NOTE_CREATED":
      return "Internal not eklendi"
    case "USER_SESSIONS_REVOKED":
      return "Oturumlar sonlandirildi"
    case "RAW_EXPORT_REQUESTED":
      return "Ham export istendi"
    case "RAW_EXPORT_DOWNLOADED":
      return "Ham export indirildi"
    case "FINANCE_REMINDER_JOB_SUCCEEDED":
      return "Finance job basarili"
    case "FINANCE_REMINDER_JOB_FAILED":
      return "Finance job hatasi"
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

export function formatApprovalActionType(actionType: AdminApprovalActionType) {
  switch (actionType) {
    case "USER_ACCOUNT_UPDATE":
      return "Kullanici hesap degisikligi"
    case "BULK_USER_ACCOUNT_UPDATE":
      return "Toplu kullanici degisikligi"
    case "ADMIN_SETTINGS_UPDATE":
      return "Admin ayari degisikligi"
    case "RAW_USER_EXPORT":
      return "Ham kullanici exportu"
    default:
      return actionType
  }
}

export function formatApprovalStatus(status: AdminApprovalRequestStatus) {
  switch (status) {
    case "PENDING":
      return "Bekliyor"
    case "APPROVED":
      return "Onaylandi"
    case "REJECTED":
      return "Reddedildi"
    case "EXPIRED":
      return "Suresi doldu"
    default:
      return status
  }
}
