export type AdminUserRole = "USER" | "ADMIN"
export type AdminDashboardRange = "7d" | "30d" | "90d"
export type AdminDashboardSegment = "all" | "active" | "inactive" | "admin"
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

export interface AdminPaginationState {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
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
  totalAmount: number
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
  role: "all" | AdminUserRole
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
  totalIncome: number
  totalExpense: number
}

export interface AdminUserDetail {
  user: {
    id: string
    name: string
    email: string
    role: AdminUserRole
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
  }
  stats: {
    totalTransactions: number
    totalIncome: number
    totalExpense: number
    goalCount: number
    categoryCount: number
  }
  windows: AdminUserWindowStat[]
  recentTransactions: Array<{
    id: string
    type: string
    amount: number
    description: string | null
    date: string
    categoryName: string | null
  }>
  topCategories: AdminTopCategory[]
  recentActivity: AdminActivityItem[]
  recentAdminChanges: AdminActivityExplorerItem[]
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
  }
  security: {
    sessionStrategy: string
    roleGuard: string
    loginRateLimit: string
  }
  governance: {
    adminCount: number
    inactiveUsers: number
    savedViews: number
  }
  values: AdminSettingValueMap
  definitions: AdminSettingDefinition[]
}

export interface AdminReportsData {
  items: AdminSavedViewSummary[]
}
