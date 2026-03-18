"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BudgetProgress } from "@/components/budgets/budget-progress"
import { GoalForm } from "@/components/budgets/goal-form"
import { formatCurrency } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import {
  PiggyBank,
  TrendingDown,
  AlertTriangle,
  Plus,
  Pencil,
  Trash2,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react"
import type { BudgetStatus, Goal, FinanceSummary } from "@/types"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [yearlySummary, setYearlySummary] = useState<{ income: number; expense: number } | null>(null)

  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [y, m] = month.split("-").map(Number)

    const [dashRes, goalsRes, yearRes] = await Promise.all([
      fetch(`/api/dashboard?month=${month}`),
      fetch(`/api/goals?year=${y}&month=${m}`),
      fetch(`/api/goals/summary?year=${y}`),
    ])

    if (dashRes.ok) {
      const data = await dashRes.json()
      setBudgets(data.budgetStatuses)
      setSummary(data.summary)
    }

    if (goalsRes.ok) {
      const goalsJson = await goalsRes.json()
      setGoals(goalsJson)
    }

    if (yearRes.ok) {
      const yearData = await yearRes.json()
      setYearlySummary({ income: yearData.income, expense: yearData.expense })
    }

    setLoading(false)
  }, [month])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchData])

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    }
  })

  const totalBudget = budgets.reduce((s, b) => s + b.budgetLimit, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.totalSpent, 0)
  const overBudgetCount = budgets.filter((b) => b.status === "danger").length

  const monthlyOverallGoals = goals.filter((g) => g.scope === "OVERALL" && g.period === "MONTHLY")
  const yearlyOverallGoals = goals.filter((g) => g.scope === "OVERALL" && g.period === "YEARLY")
  const categoryGoals = goals.filter((g) => g.scope === "CATEGORY")

  async function handleDeleteGoal(id: string) {
    if (!confirm("Bu hedefi silmek istediğinize emin misiniz?")) return
    const res = await fetch(`/api/goals/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Hedef silindi", variant: "success" })
      fetchData()
    } else {
      toast({ title: "Hata", description: "Hedef silinemedi.", variant: "destructive" })
    }
  }

  function getGoalProgress(goal: Goal): { current: number; percentage: number; status: string } {
    if (goal.direction === "SPEND_MAX") {
      const current = goal.period === "YEARLY"
        ? (yearlySummary?.expense ?? 0)
        : (summary?.totalExpense ?? 0)
      const pct = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0
      return {
        current,
        percentage: pct,
        status: pct >= 100 ? "danger" : pct >= 80 ? "warning" : "safe",
      }
    } else {
      const current = goal.period === "YEARLY"
        ? ((yearlySummary?.income ?? 0) - (yearlySummary?.expense ?? 0))
        : (summary?.balance ?? 0)
      const pct = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0
      return {
        current,
        percentage: pct,
        status: pct >= 100 ? "safe" : pct >= 50 ? "warning" : "danger",
      }
    }
  }

  function getProgressColor(status: string, direction: string) {
    if (direction === "SPEND_MAX") {
      if (status === "danger") return "bg-red-500"
      if (status === "warning") return "bg-orange-500"
      return "bg-green-500"
    }
    if (status === "safe") return "bg-green-500"
    if (status === "warning") return "bg-yellow-500"
    return "bg-red-500"
  }

  function renderGoalCard(goal: Goal) {
    const { current, percentage, status } = getGoalProgress(goal)
    const isSave = goal.direction === "SAVE"
    const isMonthly = goal.period === "MONTHLY"
    const isCategory = goal.scope === "CATEGORY"

    const periodLabel = isMonthly ? "Aylık" : "Yıllık"
    const scopeLabel = isCategory ? (goal.category?.name ?? "Kategori") : "Toplam"
    const dirLabel = isSave ? "Birikim Hedefi" : "Harcama Limiti"

    return (
      <Card key={goal.id} className="relative group">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isSave ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <Wallet className="h-5 w-5 text-blue-500" />
              )}
              <div>
                <CardTitle className="text-sm font-medium">
                  {scopeLabel} – {dirLabel}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{periodLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant={status === "safe" ? "success" : status === "warning" ? "warning" : "destructive"}
              >
                {isSave
                  ? (status === "safe" ? "Hedefe ulaşıldı" : status === "warning" ? "Yolda" : "Geride")
                  : (status === "safe" ? "Limitte" : status === "warning" ? "Dikkat" : "Aşım")}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => { setEditingGoal(goal); setGoalFormOpen(true) }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                onClick={() => handleDeleteGoal(goal.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {isSave ? "Mevcut bakiye" : "Harcanan"}: {formatCurrency(Math.abs(current))}
            </span>
            <span className="font-semibold">
              Hedef: {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <Progress
            value={Math.min(percentage, 100)}
            indicatorClassName={getProgressColor(status, goal.direction)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>%{Math.min(Math.round(percentage), 999)}</span>
            {isSave ? (
              <span>
                {current >= goal.targetAmount
                  ? `Hedefe ulaşıldı! +${formatCurrency(current - goal.targetAmount)}`
                  : `Kalan: ${formatCurrency(goal.targetAmount - current)}`}
              </span>
            ) : (
              <span>
                {current > goal.targetAmount
                  ? `${formatCurrency(current - goal.targetAmount)} aşım!`
                  : `Kalan limit: ${formatCurrency(goal.targetAmount - current)}`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bütçe Yönetimi</h1>
          <p className="text-muted-foreground">Hedeflerinizi ve bütçe durumunuzu takip edin</p>
        </div>
        <div className="flex items-center gap-3">
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
          <Button onClick={() => { setEditingGoal(null); setGoalFormOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Hedef Ekle
          </Button>
        </div>
      </div>

      {/* Özet kartları */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Bütçe</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Toplam Harcama</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            <p className="text-xs text-muted-foreground">
              Bütçenin %{totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}&apos;i
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bütçe Aşımı</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overBudgetCount}</p>
            <p className="text-xs text-muted-foreground">kategori bütçe aşımında</p>
          </CardContent>
        </Card>
      </div>

      {/* Hedefler */}
      {goals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Hedefler</h2>
          </div>

          {monthlyOverallGoals.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Aylık Toplam Hedefler</p>
              <div className="grid gap-4 md:grid-cols-2">
                {monthlyOverallGoals.map(renderGoalCard)}
              </div>
            </div>
          )}

          {yearlyOverallGoals.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Yıllık Toplam Hedefler</p>
              <div className="grid gap-4 md:grid-cols-2">
                {yearlyOverallGoals.map(renderGoalCard)}
              </div>
            </div>
          )}

          {categoryGoals.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Kategori Bazlı Hedefler</p>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryGoals.map(renderGoalCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {goals.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">Henüz hedef yok</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aylık veya yıllık hedefler ekleyerek bütçenizi daha iyi kontrol edin.
            </p>
            <Button onClick={() => { setEditingGoal(null); setGoalFormOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              İlk Hedefinizi Ekleyin
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Kategori bütçe limitleri */}
      {budgets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Kategori Bütçe Limitleri</h2>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2"><div className="h-5 w-32 rounded bg-muted" /></CardHeader>
                  <CardContent><div className="h-2 w-full rounded bg-muted" /></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <BudgetProgress budgets={budgets} />
          )}
        </div>
      )}

      <GoalForm
        open={goalFormOpen}
        onClose={() => { setGoalFormOpen(false); setEditingGoal(null) }}
        onSaved={fetchData}
        editGoal={editingGoal}
      />
    </div>
  )
}
