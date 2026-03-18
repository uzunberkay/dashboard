"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"
import type { FinanceSummary } from "@/types"

interface FinanceSummaryCardsProps {
  summary: FinanceSummary
}

export function FinanceSummaryCards({ summary }: FinanceSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(summary.totalIncome)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Toplam Harcama</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summary.totalExpense)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Kalan Bakiye</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${summary.balance >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
            {formatCurrency(summary.balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
