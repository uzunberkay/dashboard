"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Compass,
  Pencil,
  PiggyBank,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { BudgetProgress } from "@/components/budgets/budget-progress"
import { GoalForm } from "@/components/budgets/goal-form"
import { PlanningSections } from "@/components/budgets/planning-sections"
import { PageHero } from "@/components/shared/page-hero"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { fetchJsonWithCache, invalidateClientFetchCache } from "@/lib/client-fetch"
import { formatCurrency } from "@/lib/utils"
import type {
  BudgetStatus,
  DashboardData,
  Goal,
  MainCategory,
  MonthlyReport,
  NotificationPreference,
} from "@/types"

interface YearlyGoalSummary {
  income: number
  expense: number
}

type DashboardSnapshot = Pick<
  DashboardData,
  "summary" | "period" | "budgetStatuses" | "insights" | "recurringRules" | "scheduledPayments"
>

function getProgressColor(status: string, direction: string) {
  if (direction === "SPEND_MAX") {
    if (status === "danger") {
      return "bg-red-500"
    }

    if (status === "warning") {
      return "bg-orange-500"
    }

    return "bg-green-500"
  }

  if (status === "safe") {
    return "bg-green-500"
  }

  if (status === "warning") {
    return "bg-yellow-500"
  }

  return "bg-red-500"
}

export default function BudgetsPage() {
  const searchParams = useSearchParams()
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
  const [dashboardSnapshot, setDashboardSnapshot] = useState<DashboardSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [yearlySummary, setYearlySummary] = useState<YearlyGoalSummary | null>(null)
  const [notificationPreference, setNotificationPreference] = useState<NotificationPreference | null>(null)
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; name: string; parentId: string | null }>>([])

  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  )
  const queryMonth = searchParams.get("month")
  const focus = searchParams.get("focus")

  useEffect(() => {
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) {
      setMonth(queryMonth)
    }
  }, [queryMonth])

  const fetchData = useCallback(async (options?: { force?: boolean }) => {
    const { force = false } = options ?? {}
    setLoading(true)
    const [year, monthNumber] = month.split("-").map(Number)

    try {
      const [dashboardData, goalsData, yearlyData, preferencesData, reportsData, categoriesData] = await Promise.all([
        fetchJsonWithCache<DashboardData>(`/api/dashboard?month=${month}`, {
          force,
          ttlMs: 20000,
        }),
        fetchJsonWithCache<Goal[]>(`/api/goals?year=${year}&month=${monthNumber}`, {
          force,
          ttlMs: 20000,
        }),
        fetchJsonWithCache<YearlyGoalSummary>(`/api/goals/summary?year=${year}`, {
          force,
          ttlMs: 20000,
        }),
        fetchJsonWithCache<NotificationPreference>("/api/notification-preferences", {
          force,
          ttlMs: 20000,
        }),
        fetchJsonWithCache<MonthlyReport[]>("/api/monthly-reports", {
          force,
          ttlMs: 20000,
        }),
        fetchJsonWithCache<MainCategory[]>("/api/categories", {
          force,
          ttlMs: 20000,
        }),
      ])

      setBudgets(dashboardData.budgetStatuses)
      setDashboardSnapshot(dashboardData)
      setGoals(goalsData)
      setYearlySummary(yearlyData)
      setNotificationPreference(preferencesData)
      setMonthlyReports(reportsData)
      setCategoryOptions(
        categoriesData.flatMap((category) => [
          { id: category.id, name: category.name, parentId: category.parentId },
          ...category.children.map((child) => ({
            id: child.id,
            name: `${category.name} / ${child.name}`,
            parentId: child.parentId,
          })),
        ])
      )
    } catch {
      setBudgets([])
      setDashboardSnapshot(null)
      setGoals([])
      setYearlySummary(null)
      setNotificationPreference(null)
      setMonthlyReports([])
      setCategoryOptions([])
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
        return {
          value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          label: date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        }
      }),
    [now]
  )

  const totalBudget = budgets.reduce((total, item) => total + item.budgetLimit, 0)
  const totalSpent = budgets.reduce((total, item) => total + item.totalSpent, 0)
  const remainingBudget = totalBudget - totalSpent
  const overBudgetCount = budgets.filter((item) => item.status === "danger").length
  const alertCount = budgets.filter((item) => item.status !== "safe").length

  const monthlyOverallGoals = goals.filter((goal) => goal.scope === "OVERALL" && goal.period === "MONTHLY")
  const yearlyOverallGoals = goals.filter((goal) => goal.scope === "OVERALL" && goal.period === "YEARLY")
  const categoryGoals = goals.filter((goal) => goal.scope === "CATEGORY")
  const focusMeta = useMemo(() => {
    if (!focus) {
      return null
    }

    if (focus === "over-budget") {
      return {
        title: "Butce baskisi odagi",
        description: "Dashboard sizi limit baskisi olan kategori ve hedefleri net gormeniz icin bu gorunume yonlendirdi.",
      }
    }

    if (focus === "goal-risk") {
      return {
        title: "Hedef riski odagi",
        description: "Aylik hedef ritmi yakindan izlenmesi gereken noktaya geldigi icin bu alan vurgulaniyor.",
      }
    }

    if (focus === "scheduled-payments") {
      return {
        title: "Planli odeme odagi",
        description: "Yaklasan scheduled payment kayitlari karar vermenizi hizlandirmak icin one getirildi.",
      }
    }

    if (focus === "recurring-rules") {
      return {
        title: "Recurring kural odagi",
        description: "Dashboard, tekrarlayan odeme ve gelirlerinizi planlama katmanina tasimanizi oneriyor.",
      }
    }

    return {
      title: "Dashboard odagi",
      description: "Bu sayfa dashboard aksiyon merkezinden gelen baglama gore acildi.",
    }
  }, [focus])

  async function handleDeleteGoal(id: string) {
    if (!confirm("Bu hedefi silmek istediginize emin misiniz?")) {
      return
    }

    const response = await fetch(`/api/goals/${id}`, { method: "DELETE" })
    if (response.ok) {
      invalidateClientFetchCache([
        "/api/goals",
        "/api/dashboard",
        "/api/monthly-reports",
        "/api/notification-preferences",
        "/api/recurring-rules",
        "/api/scheduled-payments",
      ])
      toast({ title: "Hedef silindi", variant: "success" })
      void fetchData({ force: true })
    } else {
      toast({ title: "Hata", description: "Hedef silinemedi.", variant: "destructive" })
    }
  }

  function getGoalProgress(goal: Goal): { current: number; percentage: number; status: string } {
    if (goal.direction === "SPEND_MAX") {
      const current = goal.period === "YEARLY"
        ? (yearlySummary?.expense ?? 0)
        : (dashboardSnapshot?.summary.totalExpense ?? 0)
      const percentage = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0

      return {
        current,
        percentage,
        status: percentage >= 100 ? "danger" : percentage >= 80 ? "warning" : "safe",
      }
    }

    const current = goal.period === "YEARLY"
      ? ((yearlySummary?.income ?? 0) - (yearlySummary?.expense ?? 0))
      : (dashboardSnapshot?.summary.balance ?? 0)
    const percentage = goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0

    return {
      current,
      percentage,
      status: percentage >= 100 ? "safe" : percentage >= 50 ? "warning" : "danger",
    }
  }

  function renderGoalCard(goal: Goal) {
    const { current, percentage, status } = getGoalProgress(goal)
    const isSaveGoal = goal.direction === "SAVE"
    const isMonthly = goal.period === "MONTHLY"
    const scopeLabel = goal.scope === "CATEGORY" ? (goal.category?.name ?? "Kategori") : "Toplam"

    return (
      <Card key={goal.id} className="group rounded-[24px] ">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {isSaveGoal ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <Wallet className="h-4 w-4 text-primary" />
                )}
                <CardTitle className="text-base">
                  {scopeLabel} / {isSaveGoal ? "Birikim hedefi" : "Harcama limiti"}
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                {isMonthly ? "Aylik" : "Yillik"} takip / Hedef {formatCurrency(goal.targetAmount)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant={
                  status === "safe"
                    ? "success"
                    : status === "warning"
                      ? "warning"
                      : "destructive"
                }
              >
                {status === "safe" ? "Yolunda" : status === "warning" ? "Izlenmeli" : "Riskli"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => {
                  setEditingGoal(goal)
                  setGoalFormOpen(true)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => handleDeleteGoal(goal.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Mevcut durum</p>
              <p className="mt-1 text-lg font-semibold">{formatCurrency(current)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Ilerleme</p>
              <p className="mt-1 text-lg font-semibold">%{Math.min(Math.round(percentage), 999)}</p>
            </div>
          </div>
          <Progress
            value={Math.min(percentage, 100)}
            indicatorClassName={getProgressColor(status, goal.direction)}
            className="h-2.5"
          />
          <p className="text-xs text-muted-foreground">
            {isSaveGoal
              ? (current >= goal.targetAmount
                  ? `Hedef asildi: +${formatCurrency(current - goal.targetAmount)}`
                  : `Hedefe kalan: ${formatCurrency(goal.targetAmount - current)}`)
              : (current > goal.targetAmount
                  ? `${formatCurrency(current - goal.targetAmount)} kadar limit asildi.`
                  : `Kalan limit: ${formatCurrency(goal.targetAmount - current)}`)}
          </p>
        </CardContent>
      </Card>
    )
  }

  const heroStats = [
    {
      label: "Secili donem",
      value: dashboardSnapshot?.period.label ?? month,
      helper: "Aylik limit ve hedef takibi bu doneme gore guncellenir.",
    },
    {
      label: "Toplam limit",
      value: formatCurrency(totalBudget),
      helper: `${budgets.length} kategori icin tanimli butce var.`,
    },
    {
      label: "Aktif uyari",
      value: String(alertCount),
      helper: overBudgetCount > 0 ? `${overBudgetCount} kategori limiti asti.` : "Kritik asim bulunmuyor.",
      tone: overBudgetCount > 0 ? ("danger" as const) : alertCount > 0 ? ("warning" as const) : ("success" as const),
    },
    {
      label: "Aylik hedef durumu",
      value: dashboardSnapshot?.insights.monthlyGoalProgress
        ? `%${Math.round(dashboardSnapshot.insights.monthlyGoalProgress.percentage)}`
        : "Tanimsiz",
      helper: dashboardSnapshot?.insights.monthlyGoalProgress
        ? `${formatCurrency(dashboardSnapshot.insights.monthlyGoalProgress.remainingAmount)} alan kaldi.`
        : "Aylik toplam hedef tanimlayarak ilerlemeyi acabilirsiniz.",
      tone:
        dashboardSnapshot?.insights.monthlyGoalProgress?.status === "danger"
          ? ("danger" as const)
          : dashboardSnapshot?.insights.monthlyGoalProgress?.status === "warning"
            ? ("warning" as const)
            : ("default" as const),
    },
  ]

  const summaryCards = [
    {
      title: "Toplam butce",
      value: formatCurrency(totalBudget),
      helper: "Tanimli kategori limitlerinin toplami.",
      icon: PiggyBank,
      tone: "text-foreground",
    },
    {
      title: "Toplam harcama",
      value: formatCurrency(totalSpent),
      helper: "Secili donemde limitlere karsi harcanan tutar.",
      icon: TrendingDown,
      tone: "text-expense",
    },
    {
      title: "Kalan limit",
      value: formatCurrency(remainingBudget),
      helper: remainingBudget >= 0 ? "Butce alaniniz devam ediyor." : "Toplam limit asin durumda.",
      icon: Wallet,
      tone: remainingBudget >= 0 ? "text-income" : "text-expense",
    },
    {
      title: "Riskli kategori",
      value: String(alertCount),
      helper: "Warning ve danger durumundaki limit sayisi.",
      icon: AlertTriangle,
      tone: alertCount > 0 ? "text-warning" : "text-income",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Butce ve hedef merkezi"
        title="Butce yonetimi"
        description="Kategori limitlerini, aylik hedefleri ve toplam harcama baskisini tek ekranda takip edin. Bu sayfa karar vermeyi kolaylastiran net bir durum gorunumu sunar."
        actions={(
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full rounded-xl  sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild variant="outline">
              <Link href="/categories" prefetch>
                Kategoriler
              </Link>
            </Button>
            <Button
              onClick={() => {
                setEditingGoal(null)
                setGoalFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Hedef ekle
            </Button>
          </>
        )}
        stats={heroStats}
      />

      {focusMeta ? (
        <Card className="rounded-2xl border-primary/15 bg-primary/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{focusMeta.title}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{focusMeta.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className="rounded-[24px] ">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className={`text-3xl font-semibold tracking-tight ${card.tone}`}>{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-[24px] border "
            />
          ))}
        </div>
      ) : null}

      {!loading && dashboardSnapshot ? (
        <PlanningSections
          recurringRules={dashboardSnapshot.recurringRules}
          scheduledPayments={dashboardSnapshot.scheduledPayments}
          notificationPreference={notificationPreference}
          monthlyReports={monthlyReports}
          categories={categoryOptions}
          focus={focus}
          onRefresh={() => fetchData({ force: true })}
        />
      ) : null}

      {!loading && goals.length > 0 ? (
        <div className="space-y-6">
          {monthlyOverallGoals.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Aylik toplam hedefler</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {monthlyOverallGoals.map(renderGoalCard)}
              </div>
            </section>
          ) : null}

          {yearlyOverallGoals.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Yillik toplam hedefler</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {yearlyOverallGoals.map(renderGoalCard)}
              </div>
            </section>
          ) : null}

          {categoryGoals.length > 0 ? (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Kategori bazli hedefler</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {categoryGoals.map(renderGoalCard)}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {!loading && goals.length === 0 ? (
        <Card className="rounded-[24px] border-dashed border-border/80 bg-card/95">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-medium">Henuz hedef yok</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Aylik veya yillik hedef ekleyerek harcama limitlerinizi ve birikim ritminizi daha net okuyabilirsiniz.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setEditingGoal(null)
                setGoalFormOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Ilk hedefinizi ekleyin
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!loading ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Kategori butce limitleri</h2>
          </div>
          <BudgetProgress budgets={budgets} />
        </section>
      ) : null}

      <GoalForm
        open={goalFormOpen}
        onClose={() => {
          setGoalFormOpen(false)
          setEditingGoal(null)
        }}
        onSaved={() => {
          invalidateClientFetchCache([
            "/api/goals",
            "/api/dashboard",
            "/api/monthly-reports",
            "/api/notification-preferences",
            "/api/recurring-rules",
            "/api/scheduled-payments",
          ])
          void fetchData({ force: true })
        }}
        editGoal={editingGoal}
      />
    </div>
  )
}
