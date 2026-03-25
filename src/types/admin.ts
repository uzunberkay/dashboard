export type AdminUserRole = "USER" | "SUPPORT" | "ANALYST" | "OPS_ADMIN" | "SUPER_ADMIN"
export type AdminStaffRole = Exclude<AdminUserRole, "USER">
export type AdminDashboardRange = "7d" | "30d" | "90d"
export type AdminDashboardSegment = "all" | "active" | "inactive" | "staff"
export type AdminUsersSortField = "createdAt" | "lastLoginAt" | "transactionCount"
export type SortDirection = "asc" | "desc"
export type AdminSavedViewScope = "DASHBOARD" | "ACTIVITY" | "USERS"
export type AdminSettingKey =
  | "dashboardDefaultRange"
  | "activityRetentionDays"
  | "exportMaxRows"
  | "dbDegradedThresholdMs"
  | "dashboardCacheTtlSec"
  | "systemCacheTtlSec"
export type AdminActivityEvent =
  | "LOGIN"
  | "USER_CREATED"
  | "USER_STATUS_CHANGED"
  | "USER_ROLE_CHANGED"
  | "BULK_USER_UPDATED"
  | "ADMIN_SETTINGS_UPDATED"
  | "ADMIN_EXPORT_CREATED"
  | "SAVED_VIEW_CREATED"
  | "SAVED_VIEW_UPDATED"
  | "SAVED_VIEW_DELETED"
  | "APPROVAL_REQUESTED"
  | "APPROVAL_APPROVED"
  | "APPROVAL_REJECTED"
  | "USER_NOTE_CREATED"
  | "USER_SESSIONS_REVOKED"
  | "RAW_EXPORT_REQUESTED"
  | "RAW_EXPORT_DOWNLOADED"
  | "FINANCE_REMINDER_JOB_SUCCEEDED"
  | "FINANCE_REMINDER_JOB_FAILED"
export type AdminApprovalActionType =
  | "USER_ACCOUNT_UPDATE"
  | "BULK_USER_ACCOUNT_UPDATE"
  | "ADMIN_SETTINGS_UPDATE"
  | "RAW_USER_EXPORT"
export type AdminApprovalRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED"
export type AdminPermission =
  | "dashboard:view"
  | "users:view"
  | "users:detail:masked"
  | "users:detail:full"
  | "users:notes:create"
  | "users:sessions:revoke"
  | "users:request:user-ops"
  | "users:manage:staff"
  | "users:bulk:update"
  | "activity:view"
  | "reports:view"
  | "reports:export:aggregate"
  | "reports:export:activity"
  | "savedViews:manage"
  | "system:view"
  | "system:jobs:run"
  | "settings:view"
  | "settings:request:update"
  | "approvals:view"
  | "approvals:approve:user-ops"
  | "approvals:approve:sensitive"
  | "users:raw-export:request"

export interface AdminPaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface AdminCurrentUser {
  id: string
  name: string
  email: string
  role: AdminStaffRole
  permissions: AdminPermission[]
}

export interface AdminDashboardFilters {
  range: AdminDashboardRange
  segment: AdminDashboardSegment
}

export interface AdminDashboardSummary {
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalTransactions: number
  goalUsageRate: number
  transactionsPerActiveUser: number
}

export interface AdminTrendPoint {
  date: string
  transactions: number
  logins: number
  newUsers: number
}

export interface AdminActivityItem {
  id: string
  event: AdminActivityEvent
  createdAt: string
  actorName: string
  targetName: string
  description: string
  ipAddress: string | null
}

export interface AdminActivityExplorerItem {
  id: string
  event: AdminActivityEvent
  createdAt: string
  actorName: string
  actorEmail: string | null
  targetName: string
  targetEmail: string | null
  description: string
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
}

export interface AdminTopCategory {
  id: string
  name: string
  parentName: string | null
  totalAmount: number | null
  transactionCount: number
}

export interface AdminAnomalyCard {
  id: string
  severity: "info" | "warning"
  title: string
  description: string
  value: string
}

export interface AdminSavedViewSummary {
  id: string
  scope: AdminSavedViewScope
  name: string
  isDefault: boolean
  filters: Record<string, string>
  href: string
  createdAt: string
  updatedAt: string
  createdByName: string
  createdByEmail: string | null
}

export interface AdminDashboardData {
  filters: AdminDashboardFilters
  summary: AdminDashboardSummary
  trend: AdminTrendPoint[]
  topCategories: AdminTopCategory[]
  anomalies: AdminAnomalyCard[]
  recentActivity: AdminActivityItem[]
}

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  role: AdminUserRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  transactionCount: number
}

export interface AdminUsersFilters {
  query: string
  role: "all" | "staff" | AdminUserRole
  status: "all" | "active" | "inactive"
  sort: AdminUsersSortField
  direction: SortDirection
}

export interface AdminUsersResponse {
  items: AdminUserListItem[]
  pagination: AdminPaginationState
  filters: AdminUsersFilters
}

export interface AdminUserWindowStat {
  days: number
  transactionCount: number
  totalIncome: number | null
  totalExpense: number | null
}

export interface AdminUserDeviceSummary {
  ipAddress: string | null
  userAgent: string | null
  lastSeenAt: string
  loginCount: number
}

export interface AdminUserNoteItem {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  authorName: string
  authorEmail: string | null
}

export interface AdminApprovalRequestSummary {
  id: string
  actionType: AdminApprovalActionType
  status: AdminApprovalRequestStatus
  createdAt: string
  expiresAt: string
  decidedAt: string | null
  reason: string | null
  rejectionReason: string | null
  targetUser: {
    id: string | null
    name: string
    email: string | null
    role: AdminUserRole | null
  } | null
  requestedBy: {
    id: string
    name: string
    email: string | null
    role: AdminUserRole
  }
  approvedBy: {
    id: string
    name: string
    email: string | null
    role: AdminUserRole
  } | null
  summaryLines: string[]
  isSensitive: boolean
  canApprove: boolean
  canReject: boolean
  availableDownload: {
    url: string
    expiresAt: string
  } | null
}

export interface AdminApprovalQueueData {
  pending: AdminApprovalRequestSummary[]
  recent: AdminApprovalRequestSummary[]
}

export interface AdminUserDetail {
  user: {
    id: string
    name: string
    email: string
    role: AdminUserRole
    isActive: boolean
    sessionVersion: number
    createdAt: string
    lastLoginAt: string | null
  }
  sensitiveDataVisible: boolean
  canCreateNotes: boolean
  canRequestUserOps: boolean
  canManageStaffRoles: boolean
  canRevokeSessions: boolean
  canRequestRawExport: boolean
  stats: {
    totalTransactions: number
    totalIncome: number | null
    totalExpense: number | null
    goalCount: number
    categoryCount: number
  }
  windows: AdminUserWindowStat[]
  recentTransactions: Array<{
    id: string
    type: string
    amount: number | null
    description: string | null
    date: string
    categoryName: string | null
  }>
  topCategories: AdminTopCategory[]
  recentActivity: AdminActivityItem[]
  recentAdminChanges: AdminActivityExplorerItem[]
  recentDevices: AdminUserDeviceSummary[]
  notes: AdminUserNoteItem[]
  recentApprovalRequests: AdminApprovalRequestSummary[]
  approvedRawExport: {
    url: string
    expiresAt: string
  } | null
}

export interface AdminActivityFilters {
  event: "all" | AdminActivityEvent
  actor: string
  target: string
  from: string
  to: string
  ip: string
  query: string
}

export interface AdminActivityResponse {
  items: AdminActivityExplorerItem[]
  pagination: AdminPaginationState
  filters: AdminActivityFilters
}

export interface AdminSystemData {
  environment: string
  apiStatus: "healthy" | "degraded"
  databaseStatus: "healthy" | "degraded"
  dbResponseTimeMs: number
  generatedAt: string
  policies: {
    activityRetentionDays: number
    exportMaxRows: number
    dbDegradedThresholdMs: number
    dashboardCacheTtlSec: number
    systemCacheTtlSec: number
  }
  approvals: {
    pendingCount: number
    sensitivePendingCount: number
    expiredCount: number
  }
  financeReminderJob: {
    lastStatus: "success" | "failed" | "never"
    lastRunAt: string | null
    lastProcessedCount: number | null
    lastError: string | null
    pendingReminderCount: number
    failedReminderCount: number
  }
  recentErrors: Array<{
    message: string
    timestamp: string
    meta?: Record<string, unknown>
  }>
}

export interface AdminSettingValueMap {
  dashboardDefaultRange: AdminDashboardRange
  activityRetentionDays: number
  exportMaxRows: number
  dbDegradedThresholdMs: number
  dashboardCacheTtlSec: number
  systemCacheTtlSec: number
}

export interface AdminSettingDefinition {
  key: AdminSettingKey
  label: string
  description: string
  inputType: "select" | "number"
  min?: number
  max?: number
  step?: number
  options?: Array<{
    label: string
    value: string
  }>
}

export interface AdminSettingsData {
  currentAdmin: {
    name: string
    email: string
    role: AdminStaffRole
  }
  security: {
    sessionStrategy: string
    roleGuard: string
    loginRateLimit: string
    approvalFlow: string
  }
  governance: {
    staffCount: number
    superAdminCount: number
    inactiveUsers: number
    savedViews: number
    pendingApprovals: number
  }
  values: AdminSettingValueMap
  definitions: AdminSettingDefinition[]
}

export interface AdminReportsData {
  items: AdminSavedViewSummary[]
}

export interface AdminAggregateExportData {
  generatedAt: string
  userCounts: Record<AdminUserRole, number>
  inactiveUsers: number
  transactionCount: number
  pendingApprovals: number
  reminderCounts: {
    pending: number
    failed: number
    sent: number
  }
  monthlyReportCount: number
}
