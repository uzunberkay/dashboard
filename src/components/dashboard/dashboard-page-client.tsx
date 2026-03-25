"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  PiggyBank,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { DashboardOverviewPanels } from "@/components/dashboard/assistant-overview-panels"
import { BudgetProgress } from "@/components/dashboard/budget-progress"
import { ChartSkeletonCard } from "@/components/dashboard/chart-skeleton-card"
import { DashboardInsightsPanel } from "@/components/dashboard/dashboard-insights-panel"
import { DashboardPlanningPanels } from "@/components/dashboard/planning-panels"
import { DashboardRiskPanel } from "@/components/dashboard/dashboard-risk-panel"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { TransactionList } from "@/components/dashboard/transaction-list"
import { PageHero } from "@/components/shared/page-hero"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchJsonWithCache } from "@/lib/client-fetch"
import { formatCurrency } from "@/lib/utils"
import type { BudgetStatus, DashboardData } from "@/types"

interface TopCategoryItem {
  id: string
  name: string
  spent: number
  limit: number
  status: "safe" | "warning" | "danger"
}

interface KpiDefinition {
  title: string
  value: string
  description: string
  tone: "income" | "expense" | "warning" | "neutral"
  icon: LucideIcon
  trendLabel: string
  trendTone: "positive" | "negative" | "neutral" | "warning"
}

interface DashboardPageClientProps {
  initialData: DashboardData
  initialMonth: string
}

const EMPTY_ERROR_MESSAGE = "Dashboard verisi yuklenemedi. Lutfen tekrar deneyin."
const CATEGORY_CHART_FALLBACK_TITLE = "Kategori dagilimi"
const EXPENSE_CHART_FALLBACK_TITLE = "Aylik harcama trendi"

const CategoryChart = dynamic(
  () => import("@/components/dashboard/category-chart").then((module) => module.CategoryChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonCard title={CATEGORY_CHART_FALLBACK_TITLE} />,
  }
)

const ExpenseChart = dynamic(
  () => import("@/components/dashboard/expense-chart").then((module) => module.ExpenseChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonCard title={EXPENSE_CHART_FALLBACK_TITLE} />,
  }
)

function formatPercentage(value: number, maximumFractionDigits = 0) {
  return `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits }).format(value)}`
}

function getMonthDays(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

function getTrendTone(
  delta: number,
  positiveIsGood: boolean
): "positive" | "negative" | "neutral" | "warning" {
  if (delta === 0) {
    return "neutral"
  }

  if (positiveIsGood) {
    return delta > 0 ? "positive" : "warning"
  }

  return delta < 0 ? "positive" : "warning"
}

function buildTrendLabel(
  delta: number,
  percentage: number | null,
  previousLabel: string,
  positiveIsGood: boolean
) {
  if (delta === 0) {
    return {
      label: `${previousLabel} ile ayni seviyede`,
      tone: "neutral" as const,
    }
  }

  if (percentage === null) {
    return {
      label: `${previousLabel} bazinda yeni hareket`,
      tone: getTrendTone(delta, positiveIsGood),
    }
  }

  return {
    label: `${previousLabel} gore ${formatPercentage(Math.abs(percentage))} ${delta > 0 ? "artis" : "azalis"}`,
    tone: getTrendTone(delta, positiveIsGood),
  }
}

export function DashboardPageClient({
  initialData,
  initialMonth,
}: DashboardPageClientProps) {
  const [data, setData] = useState<DashboardData | null>(initialData)
  const [loadedMonth, setLoadedMonth] = useState(initialData.period.value)
  const [month, setMonth] = useState(initialMonth)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentDate = useMemo(() => new Date(), [])

  const fetchDashboard = useCallback(
    async (
      requestedMonth: string,
      options?: {
        signal?: AbortSignal
        force?: boolean
      }
    ) => {
      const { signal, force = false } = options ?? {}
      const isMonthSwitch = requestedMonth !== loadedMonth

      setLoading(true)
      setError(null)

      if (isMonthSwitch) {
        setData(null)
      }

      try {
        const payload = await fetchJsonWithCache<DashboardData>(
          `/api/dashboard?month=${requestedMonth}`,
          {
            signal,
            force,
            ttlMs: 20000,
          }
        )

        setData(payload)
        setLoadedMonth(payload.period.value)
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
          return
        }

        if (isMonthSwitch) {
          setData(null)
        }
        setError(EMPTY_ERROR_MESSAGE)
      } finally {
        if (!signal?.aborted) {
          setLoading(false)
        }
      }
    },
    [loadedMonth]
  )

  useEffect(() => {
    if (data && month === loadedMonth) {
      return
    }

    const controller = new AbortController()
    void fetchDashboard(month, { signal: controller.signal })

    return () => controller.abort()
  }, [data, fetchDashboard, loadedMonth, month])

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const valueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1)
        return {
          value: `${valueDate.getFullYear()}-${String(valueDate.getMonth() + 1).padStart(2, "0")}`,
          label: valueDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        }
      }),
    [currentDate]
  )

  const selectedMonthDate = useMemo(() => {
    const [selectedYear, selectedMonth] = month.split("-").map(Number)
    return new Date(selectedYear, selectedMonth - 1, 1)
  }, [month])

  const previousMonthDate = useMemo(
    () => new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1),
    [selectedMonthDate]
  )

  const topCategories = useMemo<TopCategoryItem[]>(() => {
    if (!data) {
      return []
    }

    const budgetByCategoryId = new Map(data.budgetStatuses.map((item) => [item.categoryId, item]))
    const totalExpenseFallback = Math.max(data.summary.totalExpense, 1)

    return data.categoryData.slice(0, 5).map((category) => {
      const matchingBudget = category.categoryIds
        .map((categoryId) => budgetByCategoryId.get(categoryId))
        .find((item): item is BudgetStatus => item !== undefined)

      const ratio = category.value / totalExpenseFallback

      return {
        id: category.id,
        name: category.name,
        spent: category.value,
        limit: Math.max(matchingBudget?.budgetLimit ?? totalExpenseFallback, category.value, 1),
        status:
          matchingBudget?.status ??
          (ratio >= 0.4 ? "danger" : ratio >= 0.25 ? "warning" : "safe"),
      }
    })
  }, [data])

  const isCompletelyEmpty = useMemo(() => {
    if (!data) {
      return false
    }

    return (
      data.summary.totalIncome === 0 &&
      data.summary.totalExpense === 0 &&
      data.categoryData.length === 0 &&
      data.recentTransactions.length === 0 &&
      data.scheduledPayments.length === 0 &&
      data.recurringRules.length === 0
    )
  }, [data])

  const previousSavingsRate = useMemo(() => {
    if (!data || data.comparison.previousIncome <= 0) {
      return 0
    }

    return (data.comparison.previousBalance / data.comparison.previousIncome) * 100
  }, [data])

  const previousDailyAverage = useMemo(() => {
    if (!data) {
      return 0
    }

    return data.comparison.previousExpense / Math.max(getMonthDays(previousMonthDate), 1)
  }, [data, previousMonthDate])

  const savingsTrend = useMemo(
    () =>
      buildTrendLabel(
        (data?.insights.savingsRate ?? 0) - previousSavingsRate,
        previousSavingsRate === 0
          ? null
          : (((data?.insights.savingsRate ?? 0) - previousSavingsRate) / previousSavingsRate) * 100,
        data?.period.previousLabel ??
          previousMonthDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        true
      ),
    [data, previousMonthDate, previousSavingsRate]
  )

  const dailyAverageTrend = useMemo(
    () =>
      buildTrendLabel(
        (data?.insights.dailyAverage ?? 0) - previousDailyAverage,
        previousDailyAverage === 0
          ? null
          : (((data?.insights.dailyAverage ?? 0) - previousDailyAverage) / previousDailyAverage) * 100,
        data?.period.previousLabel ??
          previousMonthDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        false
      ),
    [data, previousDailyAverage, previousMonthDate]
  )

  const transactionTrend = useMemo(
    () =>
      buildTrendLabel(
        (data?.activity.transactionCount ?? 0) - (data?.activity.previousTransactionCount ?? 0),
        (data?.activity.previousTransactionCount ?? 0) === 0
          ? null
          : (((data?.activity.transactionCount ?? 0) -
              (data?.activity.previousTransactionCount ?? 0)) /
              (data?.activity.previousTransactionCount ?? 1)) *
              100,
        data?.period.previousLabel ??
          previousMonthDate.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        true
      ),
    [data, previousMonthDate]
  )

  const kpiCards = useMemo<KpiDefinition[]>(() => {
    if (!data) {
      return []
    }

    const balanceTrend = buildTrendLabel(
      data.comparison.balanceDelta,
      data.comparison.balanceDeltaPct,
      data.period.previousLabel,
      true
    )
    const incomeTrend = buildTrendLabel(
      data.comparison.incomeDelta,
      data.comparison.incomeDeltaPct,
      data.period.previousLabel,
      true
    )
    const expenseTrend = buildTrendLabel(
      data.comparison.expenseDelta,
      data.comparison.expenseDeltaPct,
      data.period.previousLabel,
      false
    )

    return [
      {
        title: "Net durum",
        value: formatCurrency(data.summary.balance),
        description:
          data.summary.balance >= 0
            ? "Gelirler giderlerin uzerinde seyrediyor."
            : "Giderler gelirlerin uzerine cikmis durumda.",
        tone: data.summary.balance >= 0 ? "neutral" : "warning",
        icon: Wallet,
        trendLabel: balanceTrend.label,
        trendTone: balanceTrend.tone,
      },
      {
        title: "Bu ay gelir",
        value: formatCurrency(data.summary.totalIncome),
        description: `${data.activity.incomeCount} gelir kaydi bu doneme dahil edildi.`,
        tone: "income",
        icon: TrendingUp,
        trendLabel: incomeTrend.label,
        trendTone: incomeTrend.tone,
      },
      {
        title: "Bu ay gider",
        value: formatCurrency(data.summary.totalExpense),
        description: `${data.activity.expenseCount} gider kaydi aktif olarak izleniyor.`,
        tone: "expense",
        icon: TrendingDown,
        trendLabel: expenseTrend.label,
        trendTone: expenseTrend.tone,
      },
      {
        title: "Tasarruf orani",
        value: formatPercentage(data.insights.savingsRate, 1),
        description:
          data.summary.totalIncome > 0
            ? "Gelirin ne kadarinin bakiye olarak kaldigini gosterir."
            : "Gelir olmadiginda oran 0 kabul edilir.",
        tone: data.insights.savingsRate >= 0 ? "neutral" : "warning",
        icon: PiggyBank,
        trendLabel: savingsTrend.label,
        trendTone: savingsTrend.tone,
      },
      {
        title: "Gunluk ortalama harcama",
        value: formatCurrency(data.insights.dailyAverage),
        description: "Secili ayin aktif gunlerine gore normalize edildi.",
        tone: "warning",
        icon: CalendarDays,
        trendLabel: dailyAverageTrend.label,
        trendTone: dailyAverageTrend.tone,
      },
      {
        title: "Islem sayisi",
        value: new Intl.NumberFormat("tr-TR").format(data.activity.transactionCount),
        description: `${data.activity.expenseCount} gider / ${data.activity.incomeCount} gelir hareketi.`,
        tone: "neutral",
        icon: ArrowLeftRight,
        trendLabel: transactionTrend.label,
        trendTone: transactionTrend.tone,
      },
    ]
  }, [data, dailyAverageTrend, savingsTrend, transactionTrend])

  if (loading && !data) {
    return <DashboardSkeleton />
  }

  if (!loading && !data && error) {
    return (
      <Card className="rounded-[24px]">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <AlertCircle className="h-10 w-10 text-expense" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">Dashboard yuklenemedi</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => void fetchDashboard(month, { force: true })}>
            Tekrar dene
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  const heroStats = [
    {
      label: "Secili donem",
      value: data.period.label,
      helper: `Karsilastirma baziniz ${data.period.previousLabel}.`,
    },
    {
      label: "Saglik skoru",
      value: `${data.healthScore.score}/100`,
      helper: data.healthScore.summary,
      tone:
        data.healthScore.score >= 75
          ? ("success" as const)
          : data.healthScore.score >= 55
            ? ("default" as const)
            : data.healthScore.score >= 35
              ? ("warning" as const)
              : ("danger" as const),
    },
    {
      label: "Butce uyarisi",
      value: String(data.insights.budgetAlertCount),
      helper:
        data.insights.overBudgetCount > 0
          ? `${data.insights.overBudgetCount} kategori limitini asti.`
          : "Asim tespit edilmedi.",
      tone:
        data.insights.overBudgetCount > 0
          ? ("danger" as const)
          : data.insights.budgetAlertCount > 0
            ? ("warning" as const)
            : ("success" as const),
    },
    {
      label: "Planli odemeler",
      value: String(data.scheduledPayments.filter((item) => item.status === "PENDING").length),
      helper: `${data.subscriptions.totalActive} aktif recurring kural izleniyor.`,
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Akilli finans asistani"
        title="Kisisel dashboard"
        description={`${data.period.label} icin gelir, gider, riskler ve sonraki adimlarinizi ayni merkezde toplayin. Bu alan sayilari yorumlayip sizi dogru akisa yonlendirecek sekilde kurgulandi.`}
        actions={(
          <>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full rounded-xl border-white/[0.08] bg-white/[0.04] backdrop-blur-sm sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchDashboard(month, { force: true })}
            >
              <RefreshCcw className="h-4 w-4" />
              Yenile
            </Button>
            <Button asChild variant="outline">
              <Link href={`/transactions?month=${month}`} prefetch>
                Islemlere git
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/budgets?month=${month}`} prefetch>
                Butce ve planlama
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
        stats={heroStats}
      />

      {error ? (
        <Card className="rounded-2xl border-warning/30 bg-warning/8 backdrop-blur-sm">
          <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <StatusBadge tone="warning" label="Baglanti uyarisi" />
              <p className="text-muted-foreground">
                Veri yenilenirken bir hata olustu. Son basarili durum ekranda tutuluyor.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void fetchDashboard(month, { force: true })}
            >
              Yeniden dene
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <DashboardOverviewPanels data={data} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((item) => (
          <KpiCard
            key={item.title}
            title={item.title}
            value={item.value}
            description={item.description}
            tone={item.tone}
            icon={item.icon}
            trendLabel={item.trendLabel}
            trendTone={item.trendTone}
          />
        ))}
      </div>

      {isCompletelyEmpty ? (
        <Card className="rounded-[24px] border-dashed border-white/[0.1] bg-card/50">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-14 text-center">
            <CircleDollarSign className="h-12 w-12 text-neutral" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">Bu donem icin dashboard bos</p>
              <p className="text-sm text-muted-foreground">
                Ilk gelir, gider, recurring kural veya hedef kaydini eklediginde tum paneller otomatik dolar.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/transactions" prefetch>
                  Islem ekle
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/budgets?focus=recurring-rules" prefetch>
                  Butce ve hedefleri duzenle
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <DashboardPlanningPanels data={data} />

          <div className="grid gap-4 xl:grid-cols-2">
            <DashboardInsightsPanel
              topCategory={data.insights.topCategory}
              highestExpenseTransaction={data.activity.highestExpenseTransaction}
              peakExpenseDay={data.activity.peakExpenseDay}
            />
            <DashboardRiskPanel
              budgetStatuses={data.budgetStatuses}
              monthlyGoalProgress={data.insights.monthlyGoalProgress}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Suspense fallback={<ChartSkeletonCard title={EXPENSE_CHART_FALLBACK_TITLE} />}>
              <ExpenseChart
                data={data.dailyData}
                dailyAverage={data.insights.dailyAverage}
                peakExpenseDay={data.activity.peakExpenseDay}
              />
            </Suspense>
            <Suspense fallback={<ChartSkeletonCard title={CATEGORY_CHART_FALLBACK_TITLE} />}>
              <CategoryChart data={data.categoryData} month={month} />
            </Suspense>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <TransactionList
              transactions={data.recentTransactions}
              periodLabel={data.period.label}
            />

            <Card className="rounded-[24px]">
              <CardHeader className="space-y-1 p-5">
                <CardTitle className="text-base font-semibold">Butce baskisi olan kategoriler</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Limit tanimli kategorilerde hedefe gore, digerlerinde toplam gidere gore oranlanir.
                </p>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0">
                {topCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
                    Kategori analizi icin yeterli harcama verisi yok.
                  </div>
                ) : (
                  topCategories.map((category) => (
                    <BudgetProgress
                      key={category.id}
                      label={category.name}
                      spent={category.spent}
                      limit={category.limit}
                      status={category.status}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
