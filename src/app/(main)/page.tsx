"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FinanceSummaryCards } from "@/components/dashboard/finance-summary"
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart"
import { MonthlyLineChart } from "@/components/dashboard/monthly-line-chart"
import { BudgetAlerts } from "@/components/dashboard/budget-alerts"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Activity, Target } from "lucide-react"
import type { FinanceSummary, CategoryExpense, DailyExpense, BudgetStatus, TransactionWithCategory, Goal } from "@/types"

interface DashboardData {
  summary: FinanceSummary
  categoryData: CategoryExpense[]
  dailyData: DailyExpense[]
  budgetStatuses: BudgetStatus[]
  recentTransactions: TransactionWithCategory[]
  analytics: {
    dailyAverage: number
    topCategory: { name: string; amount: number } | null
    monthlyTrend: number
  }
  goals?: {
    monthlyOverall: Goal[]
    yearlyOverall: Goal[]
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/dashboard?month=${month}`)
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }, [month])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboard()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchDashboard])

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    }
  })

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
          <div className="h-9 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2"><div className="h-4 w-24 rounded bg-muted" /></CardHeader>
              <CardContent><div className="h-7 w-32 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="animate-pulse"><CardContent className="h-[350px]" /></Card>
          <Card className="animate-pulse"><CardContent className="h-[350px]" /></Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Finansal durumunuzun özeti</p>
        </div>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FinanceSummaryCards summary={data.summary} />

      <BudgetAlerts budgets={data.budgetStatuses} />

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryPieChart data={data.categoryData} month={month} />
        <MonthlyLineChart data={data.dailyData} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentTransactions transactions={data.recentTransactions} />
        </div>
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Günlük Ortalama</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(data.analytics.dailyAverage)}</p>
              <p className="text-xs text-muted-foreground">günlük ortalama harcama</p>
            </CardContent>
          </Card>
          {data.goals && data.goals.monthlyOverall.length > 0 && (() => {
            const goal = data.goals!.monthlyOverall[0]
            const isSave = goal.direction === "SAVE"
            const current = isSave ? data.summary.balance : data.summary.totalExpense
            const pct = goal.targetAmount > 0 ? (Math.abs(current) / goal.targetAmount) * 100 : 0
            const color = isSave
              ? (pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500")
              : (pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-orange-500" : "bg-green-500")
            return (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Aylık Hedef</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {isSave ? "Birikim hedefi" : "Harcama limiti"}
                  </p>
                  <p className="text-lg font-semibold">{formatCurrency(goal.targetAmount)}</p>
                  <Progress value={Math.min(pct, 100)} indicatorClassName={color} />
                  <p className="text-xs text-muted-foreground">
                    %{Math.round(pct)} – {formatCurrency(Math.abs(current))} / {formatCurrency(goal.targetAmount)}
                  </p>
                </CardContent>
              </Card>
            )
          })()}
          {data.analytics.topCategory && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">En Çok Harcama</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.analytics.topCategory.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.analytics.topCategory.amount)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
