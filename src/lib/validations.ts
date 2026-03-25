import { z } from "zod"

const adminUserRoleSchema = z.enum([
  "USER",
  "SUPPORT",
  "ANALYST",
  "OPS_ADMIN",
  "SUPER_ADMIN",
])

const adminActivityEventSchema = z.enum([
  "LOGIN",
  "USER_CREATED",
  "USER_STATUS_CHANGED",
  "USER_ROLE_CHANGED",
  "BULK_USER_UPDATED",
  "ADMIN_SETTINGS_UPDATED",
  "ADMIN_EXPORT_CREATED",
  "SAVED_VIEW_CREATED",
  "SAVED_VIEW_UPDATED",
  "SAVED_VIEW_DELETED",
  "APPROVAL_REQUESTED",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "USER_NOTE_CREATED",
  "USER_SESSIONS_REVOKED",
  "RAW_EXPORT_REQUESTED",
  "RAW_EXPORT_DOWNLOADED",
  "FINANCE_REMINDER_JOB_SUCCEEDED",
  "FINANCE_REMINDER_JOB_FAILED",
])

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Gecerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Sifre en az 6 karakter olmalidir"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Isim en az 2 karakter olmalidir"),
  email: z.string().trim().toLowerCase().email("Gecerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Sifre en az 6 karakter olmalidir"),
})

export const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("Tutar pozitif olmalidir"),
  description: z.string().optional(),
  date: z.string(),
  categoryId: z.string().optional().nullable(),
})

export const categorySchema = z.object({
  name: z.string().min(1, "Kategori adi zorunludur"),
  budgetLimit: z.number().positive("Butce limiti pozitif olmalidir").optional().nullable(),
  parentId: z.string().optional().nullable(),
})

export const reorderSchema = z.object({
  categoryId: z.string(),
  newParentId: z.string(),
  newSortOrder: z.number().int().min(0),
})

export const goalSchema = z.object({
  scope: z.enum(["OVERALL", "CATEGORY"]),
  period: z.enum(["MONTHLY", "YEARLY"]),
  direction: z.enum(["SAVE", "SPEND_MAX"]),
  targetAmount: z.number().positive("Hedef tutari pozitif olmalidir"),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12).optional().nullable(),
  categoryId: z.string().optional().nullable(),
})

export const recurringRuleSchema = z
  .object({
    name: z.string().trim().min(2, "Kural adi en az 2 karakter olmalidir"),
    type: z.enum(["INCOME", "EXPENSE"]),
    amount: z.number().positive("Tutar pozitif olmalidir"),
    description: z.string().trim().max(160).optional().nullable(),
    frequency: z.enum(["WEEKLY", "MONTHLY", "CUSTOM_MONTH_DAY"]),
    customMonthDay: z.number().int().min(1).max(31).optional().nullable(),
    startsAt: z.string(),
    endsAt: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    isSubscription: z.boolean().default(false),
    reminderDaysBefore: z.number().int().min(0).max(30).default(3),
    categoryId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "CUSTOM_MONTH_DAY" && !data.customMonthDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customMonthDay"],
        message: "Ozel ay gunu secilmelidir",
      })
    }
  })

export const scheduledPaymentCreateSchema = z.object({
  name: z.string().trim().min(2, "Odeme adi en az 2 karakter olmalidir"),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z.number().positive("Tutar pozitif olmalidir"),
  description: z.string().trim().max(160).optional().nullable(),
  dueDate: z.string(),
  categoryId: z.string().optional().nullable(),
  recurringRuleId: z.string().optional().nullable(),
  source: z.enum(["RECURRING", "MANUAL"]).default("MANUAL"),
})

export const scheduledPaymentUpdateSchema = z
  .object({
    status: z.enum(["PENDING", "PAID", "SKIPPED"]).optional(),
    transactionId: z.string().optional().nullable(),
    createTransaction: z.boolean().optional(),
    transaction: transactionSchema.optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.transactionId !== undefined ||
      data.createTransaction !== undefined,
    {
      message: "En az bir alan guncellenmelidir",
    }
  )

export const notificationPreferenceSchema = z.object({
  emailReminders: z.boolean(),
  emailMonthlyDigest: z.boolean(),
  reminderLeadDays: z.number().int().min(0).max(30),
})

export const adminUserUpdateSchema = z
  .object({
    role: adminUserRoleSchema.optional(),
    isActive: z.boolean().optional(),
    reason: z.string().trim().min(3, "Onay notu en az 3 karakter olmalidir").max(400),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: "En az bir alan guncellenmelidir",
  })

export const adminBulkActionSchema = z.object({
  userIds: z.array(z.string()).min(1, "En az bir kullanici secilmelidir"),
  action: z.enum(["enable", "disable"]),
  reason: z.string().trim().min(3, "Onay notu en az 3 karakter olmalidir").max(400),
})

export const adminDashboardFiltersSchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
  segment: z.enum(["all", "active", "inactive", "staff"]).default("all"),
})

export const adminUsersFiltersSchema = z.object({
  query: z.string().default(""),
  role: z.enum(["all", "staff", "USER", "SUPPORT", "ANALYST", "OPS_ADMIN", "SUPER_ADMIN"]).default("all"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  sort: z.enum(["createdAt", "lastLoginAt", "transactionCount"]).default("createdAt"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
})

export const adminActivityFiltersSchema = z.object({
  event: z.union([z.literal("all"), adminActivityEventSchema]).default("all"),
  actor: z.string().default(""),
  target: z.string().default(""),
  from: z.string().default(""),
  to: z.string().default(""),
  ip: z.string().default(""),
  query: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
})

export const adminSavedViewFiltersSchema = z.record(z.string(), z.string())

export const adminSavedViewCreateSchema = z.object({
  scope: z.enum(["DASHBOARD", "ACTIVITY", "USERS"]),
  name: z.string().trim().min(2, "Gorunum adi en az 2 karakter olmalidir").max(60),
  filters: adminSavedViewFiltersSchema.default({}),
  isDefault: z.boolean().default(false),
})

export const adminSavedViewUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Gorunum adi en az 2 karakter olmalidir").max(60).optional(),
    filters: adminSavedViewFiltersSchema.optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.filters !== undefined || data.isDefault !== undefined, {
    message: "En az bir alan guncellenmelidir",
  })

export const adminSettingsUpdateSchema = z
  .object({
    dashboardDefaultRange: z.enum(["7d", "30d", "90d"]).optional(),
    activityRetentionDays: z.number().int().min(30).max(3650).optional(),
    exportMaxRows: z.number().int().min(100).max(50000).optional(),
    dbDegradedThresholdMs: z.number().int().min(50).max(10000).optional(),
    dashboardCacheTtlSec: z.number().int().min(10).max(3600).optional(),
    systemCacheTtlSec: z.number().int().min(10).max(3600).optional(),
    reason: z.string().trim().min(3, "Onay notu en az 3 karakter olmalidir").max(400),
  })
  .refine((data) => Object.keys(data).some((key) => key !== "reason"), {
    message: "En az bir ayar guncellenmelidir",
  })

export const adminApprovalDecisionSchema = z
  .object({
    decision: z.enum(["approve", "reject"]),
    reason: z.string().trim().max(400).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "reject" && (!data.reason || data.reason.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Reddetme notu en az 3 karakter olmalidir",
      })
    }
  })

export const adminUserNoteCreateSchema = z.object({
  body: z.string().trim().min(3, "Not en az 3 karakter olmalidir").max(1000),
})

export const adminRawExportRequestSchema = z.object({
  reason: z.string().trim().min(3, "Onay notu en az 3 karakter olmalidir").max(400),
})

export type GoalInput = z.infer<typeof goalSchema>
export type RecurringRuleInput = z.infer<typeof recurringRuleSchema>
export type ScheduledPaymentCreateInput = z.infer<typeof scheduledPaymentCreateSchema>
export type ScheduledPaymentUpdateInput = z.infer<typeof scheduledPaymentUpdateSchema>
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>
export type AdminBulkActionInput = z.infer<typeof adminBulkActionSchema>
export type AdminDashboardFiltersInput = z.infer<typeof adminDashboardFiltersSchema>
export type AdminUsersFiltersInput = z.infer<typeof adminUsersFiltersSchema>
export type AdminActivityFiltersInput = z.infer<typeof adminActivityFiltersSchema>
export type AdminSavedViewCreateInput = z.infer<typeof adminSavedViewCreateSchema>
export type AdminSavedViewUpdateInput = z.infer<typeof adminSavedViewUpdateSchema>
export type AdminSettingsUpdateInput = z.infer<typeof adminSettingsUpdateSchema>
export type AdminApprovalDecisionInput = z.infer<typeof adminApprovalDecisionSchema>
export type AdminUserNoteCreateInput = z.infer<typeof adminUserNoteCreateSchema>
export type AdminRawExportRequestInput = z.infer<typeof adminRawExportRequestSchema>

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type CategoryInput = z.infer<typeof categorySchema>
