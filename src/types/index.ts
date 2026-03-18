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
