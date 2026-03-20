export type TransactionType = "INCOME" | "EXPENSE"

export interface TransactionWithCategory {
  id: string
  type: TransactionType
  amount: number
  description: string | null
  date: string
  categoryId: string | null
  category: { id: string; name: string; parent?: { id: string; name: string } | null } | null
  createdAt: string
}

export interface TransactionPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedTransactionsResponse {
  items: TransactionWithCategory[]
  pagination: TransactionPagination
}

export interface SubCategory {
  id: string
  name: string
  icon: string | null
  budgetLimit: number | null
  sortOrder: number
  isSystem: boolean
  parentId: string | null
  _count?: { transactions: number }
}

export interface MainCategory {
  id: string
  name: string
  icon: string | null
  budgetLimit: number | null
  sortOrder: number
  isSystem: boolean
  parentId: null
  children: SubCategory[]
  _count?: { transactions: number }
}

export interface BudgetStatus {
  categoryId: string
  categoryName: string
  parentName?: string
  budgetLimit: number
  totalSpent: number
  percentage: number
  status: "safe" | "warning" | "danger"
}

export interface FinanceSummary {
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface DashboardPeriod {
  value: string
  label: string
  previousLabel: string
}

export interface DashboardComparison {
  previousIncome: number
  previousExpense: number
  previousBalance: number
  incomeDelta: number
  expenseDelta: number
  balanceDelta: number
  incomeDeltaPct: number | null
  expenseDeltaPct: number | null
  balanceDeltaPct: number | null
}

export interface CategoryExpense {
  id: string
  name: string
  value: number
  fill: string
  categoryIds: string[]
}

export interface DailyExpense {
  date: string
  amount: number
}

export interface DashboardPeakExpenseDay {
  date: string
  amount: number
}

export interface DashboardHighestExpenseTransaction {
  id: string
  description: string | null
  amount: number
  date: string
  categoryName: string | null
}

export interface DashboardActivity {
  transactionCount: number
  previousTransactionCount: number
  incomeCount: number
  expenseCount: number
  peakExpenseDay: DashboardPeakExpenseDay | null
  highestExpenseTransaction: DashboardHighestExpenseTransaction | null
}

export interface DashboardTopCategoryInsight {
  id: string
  name: string
  amount: number
  share: number
}

export interface DashboardGoalProgress {
  targetAmount: number
  currentAmount: number
  remainingAmount: number
  percentage: number
  status: "safe" | "warning" | "danger"
}

export interface DashboardInsights {
  savingsRate: number
  dailyAverage: number
  topCategory: DashboardTopCategoryInsight | null
  budgetAlertCount: number
  overBudgetCount: number
  monthlyGoalProgress: DashboardGoalProgress | null
}

export interface Goal {
  id: string
  scope: "OVERALL" | "CATEGORY"
  period: "MONTHLY" | "YEARLY"
  direction: "SAVE" | "SPEND_MAX"
  targetAmount: number
  year: number
  month: number | null
  categoryId: string | null
  category?: { id: string; name: string } | null
}

export type RecurringFrequency = "WEEKLY" | "MONTHLY" | "CUSTOM_MONTH_DAY"
export type ScheduledPaymentStatus = "PENDING" | "PAID" | "SKIPPED"
export type ReminderChannel = "IN_APP" | "EMAIL"
export type ReminderType = "PAYMENT_UPCOMING" | "MONTHLY_DIGEST"
export type ReminderStatus = "PENDING" | "SENT" | "SKIPPED" | "FAILED"

export interface RecurringRule {
  id: string
  name: string
  type: TransactionType
  amount: number
  description: string | null
  frequency: RecurringFrequency
  customMonthDay: number | null
  startsAt: string
  endsAt: string | null
  isActive: boolean
  isSubscription: boolean
  reminderDaysBefore: number
  categoryId: string | null
  category?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export interface ScheduledPayment {
  id: string
  name: string
  type: TransactionType
  amount: number
  description: string | null
  dueDate: string
  status: ScheduledPaymentStatus
  source: "RECURRING" | "MANUAL"
  paidAt: string | null
  categoryId: string | null
  category?: { id: string; name: string } | null
  recurringRuleId: string | null
  recurringRule?: {
    id: string
    name: string
    isSubscription: boolean
    reminderDaysBefore?: number
  } | null
  transactionId: string | null
  createdAt: string
  updatedAt: string
}

export interface Reminder {
  id: string
  type: ReminderType
  channel: ReminderChannel
  status: ReminderStatus
  sendAt: string
  sentAt: string | null
  lastError: string | null
  scheduledPaymentId: string | null
  monthlyReportId: string | null
  scheduledPayment?: Pick<ScheduledPayment, "id" | "name" | "dueDate" | "amount" | "status"> | null
}

export interface NotificationPreference {
  emailReminders: boolean
  emailMonthlyDigest: boolean
  reminderLeadDays: number
}

export interface MonthlyReport {
  id: string
  title: string
  summaryText: string
  metricsJson: Record<string, unknown>
  highlightsJson: string[] | null
  emailSentAt: string | null
  year: number
  month: number
  createdAt: string
  updatedAt: string
}

export interface DashboardHealthScore {
  score: number
  label: string
  summary: string
  drivers: Array<{
    label: string
    value: string
    tone: "positive" | "warning" | "danger" | "neutral"
  }>
}

export interface DashboardActionItem {
  id: string
  title: string
  description: string
  href: string
  tone: "income" | "expense" | "warning" | "neutral"
  ctaLabel: string
}

export interface DashboardAnomaly {
  id: string
  title: string
  description: string
  tone: "warning" | "danger" | "neutral"
  value?: string
}

export interface DashboardForecast {
  expectedExpense: number
  expectedBalance: number
  expectedSavingsRate: number
  projectedGoalStatus: "safe" | "warning" | "danger" | "none"
  remainingDays: number
}

export interface DashboardCalendarEntry {
  id: string
  date: string
  type: "scheduled-payment" | "peak-expense-day" | "highest-expense-day" | "income-day"
  label: string
  amount?: number
  tone: "income" | "expense" | "warning" | "neutral"
}

export interface DashboardSubscriptionSummary {
  totalActive: number
  monthlyCommitment: number
  upcomingCount: number
  items: Array<{
    id: string
    name: string
    amount: number
    nextDueDate: string | null
    categoryName: string | null
  }>
}

export interface MonthlyDigestPreview {
  title: string
  summary: string
  highlights: string[]
}

export interface DashboardPriorityItem {
  id: string
  label: string
  reason: string
}

export interface DashboardData {
  summary: FinanceSummary
  period: DashboardPeriod
  comparison: DashboardComparison
  activity: DashboardActivity
  insights: DashboardInsights
  healthScore: DashboardHealthScore
  actionCenter: DashboardActionItem[]
  anomalies: DashboardAnomaly[]
  forecast: DashboardForecast
  calendar: DashboardCalendarEntry[]
  subscriptions: DashboardSubscriptionSummary
  monthlyDigestPreview: MonthlyDigestPreview
  reminders: Reminder[]
  personalPriorities: DashboardPriorityItem[]
  categoryData: CategoryExpense[]
  dailyData: DailyExpense[]
  budgetStatuses: BudgetStatus[]
  recentTransactions: TransactionWithCategory[]
  recurringRules: RecurringRule[]
  scheduledPayments: ScheduledPayment[]
  goals: {
    monthlyOverall: Goal[]
    yearlyOverall: Goal[]
  }
}
