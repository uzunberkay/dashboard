"use client"

import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BellRing,
  Compass,
  Gauge,
  Sparkles,
} from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn, formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils"
import type {
  DashboardActionItem,
  DashboardAnomaly,
  DashboardData,
  DashboardForecast,
  DashboardHealthScore,
  Reminder,
} from "@/types"

export function HealthScoreCard({ healthScore }: { healthScore: DashboardHealthScore }) {
  const scoreTone =
    healthScore.score >= 75
      ? "text-income"
      : healthScore.score >= 55
        ? "text-foreground"
        : healthScore.score >= 35
          ? "text-warning"
          : "text-expense"

  return (
    <Card className="rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Finans saglik skoru</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">{healthScore.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
          <div className="flex flex-col items-center justify-center rounded-[24px] border border-border/70 bg-background/60 px-4 py-5 text-center">
            <p className={cn("text-5xl font-semibold tracking-tight", scoreTone)}>{healthScore.score}</p>
            <p className="mt-2 text-sm font-medium">{healthScore.label}</p>
          </div>
          <div className="space-y-3">
            {healthScore.drivers.map((driver) => (
              <div
                key={driver.label}
                className="flex items-center justify-between rounded-[18px] border border-border/70 bg-background/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{driver.label}</p>
                  <p className="text-xs text-muted-foreground">Skoru etkileyen ana sinyal</p>
                </div>
                <StatusBadge
                  tone={
                    driver.tone === "positive"
                      ? "success"
                      : driver.tone === "warning"
                        ? "warning"
                        : driver.tone === "danger"
                          ? "danger"
                          : "neutral"
                  }
                  label={driver.value}
                />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ActionCenterCard({ items }: { items: DashboardActionItem[] }) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Aksiyon merkezi</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Oncelik sirasi yuksek 3-5 adim burada toplanir.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/80 bg-background/50 p-5 text-center text-sm text-muted-foreground">
            Bu donem icin acil aksiyon ihtiyaci gorunmuyor.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-[20px] border border-border/70 bg-background/55 p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone={
                    item.tone === "income"
                      ? "income"
                      : item.tone === "expense"
                        ? "expense"
                        : item.tone === "warning"
                          ? "warning"
                          : "neutral"
                  }
                  label={
                    item.tone === "income"
                      ? "Gelir"
                      : item.tone === "expense"
                        ? "Gider"
                        : item.tone === "warning"
                          ? "Izleme"
                          : "Planlama"
                  }
                />
                <p className="text-sm font-medium">{item.title}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href={item.href} prefetch>
                  {item.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function ReminderStrip({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) {
    return null
  }

  return (
    <Card className="rounded-[22px] border-warning/30 bg-warning/10">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-warning" />
            <p className="text-sm font-medium">Aktif hatirlaticilar</p>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Uygulama ici reminder kayitlari, planli odeme ve aylik rapor akisinizla senkron calisir.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px] lg:grid-cols-3">
          {reminders.slice(0, 3).map((reminder) => (
            <div
              key={reminder.id}
              className="rounded-[18px] border border-warning/30 bg-background/75 px-4 py-3"
            >
              <p className="text-sm font-medium">
                {reminder.scheduledPayment?.name ?? "Aylik rapor ozeti"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {reminder.scheduledPayment
                  ? `${formatCurrency(reminder.scheduledPayment.amount)} / ${formatDate(reminder.scheduledPayment.dueDate)}`
                  : "Aylik finans ozeti hazirlandiginda burada gorunur."}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Gosterim zamani: {formatRelativeTime(reminder.sendAt)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function AnomalyPanel({ anomalies }: { anomalies: DashboardAnomaly[] }) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Anomali ve icgoruler</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Normal ritimden sapan gunleri ve dikkat isteyen harcama kaymalarini toplar.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {anomalies.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/80 bg-background/50 p-5 text-center text-sm text-muted-foreground">
            Secili donemde belirgin bir sapma tespit edilmedi.
          </div>
        ) : (
          anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className="rounded-[20px] border border-border/70 bg-background/55 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{anomaly.title}</p>
                <StatusBadge
                  tone={
                    anomaly.tone === "danger"
                      ? "danger"
                      : anomaly.tone === "warning"
                        ? "warning"
                        : "neutral"
                  }
                  label={anomaly.value ?? "Sinyal"}
                />
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{anomaly.description}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function ForecastPanel({ forecast }: { forecast: DashboardForecast }) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Aylik projeksiyon</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Kalan gunler mevcut ritimde devam ederse donem sonu kapanis tahmini.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[18px] border border-border/70 bg-background/55 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Beklenen gider</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {formatCurrency(forecast.expectedExpense)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {forecast.remainingDays} gunluk alan kaldigi varsayiliyor.
            </p>
          </div>
          <div className="rounded-[18px] border border-border/70 bg-background/55 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Beklenen bakiye</p>
            <p
              className={cn(
                "mt-2 text-2xl font-semibold tracking-tight",
                forecast.expectedBalance >= 0 ? "text-income" : "text-expense"
              )}
            >
              {formatCurrency(forecast.expectedBalance)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tasarruf orani tahmini %{forecast.expectedSavingsRate.toFixed(1)}.
            </p>
          </div>
        </div>
        <div className="rounded-[18px] border border-border/70 bg-background/55 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Tahmini hedef durumu</p>
            <StatusBadge
              tone={
                forecast.projectedGoalStatus === "safe"
                  ? "success"
                  : forecast.projectedGoalStatus === "warning"
                    ? "warning"
                    : forecast.projectedGoalStatus === "danger"
                      ? "danger"
                      : "neutral"
              }
              label={
                forecast.projectedGoalStatus === "safe"
                  ? "Yolunda"
                  : forecast.projectedGoalStatus === "warning"
                    ? "Izlenmeli"
                    : forecast.projectedGoalStatus === "danger"
                      ? "Riskte"
                      : "Tanimsiz"
              }
            />
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Bu kart secili ay gecmisse fiili sonuclari, aktif ay ise kalan gunler icin tahmini kapanisi gosterir.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardOverviewPanels({ data }: { data: DashboardData }) {
  return (
    <>
      <ReminderStrip reminders={data.reminders} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <HealthScoreCard healthScore={data.healthScore} />
        <ActionCenterCard items={data.actionCenter} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <AnomalyPanel anomalies={data.anomalies} />
        <ForecastPanel forecast={data.forecast} />
      </div>
    </>
  )
}
