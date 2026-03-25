"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  CalendarClock,
  ClipboardList,
  ReceiptText,
  Sparkles,
} from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import type { DashboardData } from "@/types"

export function CalendarPanel({ data }: { data: DashboardData }) {
  return (
    <Card className="rounded-[24px] border-white/[0.08] bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Nakit akisi takvimi</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Planli odemeler, gelir zirveleri ve harcama pikleri ayni zaman cizgisinde.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {data.calendar.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/80 bg-background/50 p-5 text-center text-sm text-muted-foreground">
            Secili donem icin takvim kaydi olusmadi.
          </div>
        ) : (
          data.calendar.slice(0, 10).map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{entry.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(entry.date)}</p>
              </div>
              <div className="text-right">
                <StatusBadge
                  tone={
                    entry.tone === "income"
                      ? "income"
                      : entry.tone === "expense"
                        ? "expense"
                        : entry.tone === "warning"
                          ? "warning"
                          : "neutral"
                  }
                  label={
                    entry.type === "scheduled-payment"
                      ? "Planli"
                      : entry.type === "income-day"
                        ? "Gelir"
                        : "Pik gun"
                  }
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {typeof entry.amount === "number" ? formatCurrency(entry.amount) : "Tutar yok"}
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function SubscriptionPanel({ data }: { data: DashboardData }) {
  return (
    <Card className="rounded-[24px] border-white/[0.08] bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Abonelikler ve planli odemeler</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Tekrarlayan cikislarinizin aylik etkisini ve en yakin beklenen odemeleri gosterir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
            <p className="text-xs text-muted-foreground">Aktif abonelik</p>
            <p className="mt-1 text-lg font-semibold">{data.subscriptions.totalActive}</p>
          </div>
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
            <p className="text-xs text-muted-foreground">Aylik tahmini cikis</p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(data.subscriptions.monthlyCommitment)}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
            <p className="text-xs text-muted-foreground">Yaklasan planli odeme</p>
            <p className="mt-1 text-lg font-semibold">{data.subscriptions.upcomingCount}</p>
          </div>
        </div>

        {data.subscriptions.items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/80 bg-background/50 p-5 text-center">
            <p className="text-sm font-medium">Abonelik kaydi yok</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Tekrarlayan odeme kurali eklediginizde bu alan otomatik dolacak.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href="/budgets?focus=recurring-rules" prefetch>
                Kurallari yonet
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.subscriptions.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.categoryName ?? "Kategori yok"}
                    {item.nextDueDate ? ` / sonraki vade ${formatDate(item.nextDueDate)}` : " / sonraki vade yok"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-expense">{formatCurrency(item.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function DigestPreviewCard({ data }: { data: DashboardData }) {
  return (
    <Card className="rounded-[24px] border-white/[0.08] bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Aylik rapor ozeti</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Dashboard icindeki digest preview, aylik rapor ve email ozetiyle ayni icerik ritmini kullanir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
          <p className="text-sm font-medium">{data.monthlyDigestPreview.title}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {data.monthlyDigestPreview.summary}
          </p>
        </div>
        <div className="space-y-2">
          {data.monthlyDigestPreview.highlights.map((item) => (
            <div
              key={item}
              className="rounded-[16px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3 text-sm text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function SimulatorCard({ data }: { data: DashboardData }) {
  const [incomeLift, setIncomeLift] = useState(0)
  const [topCategoryCut, setTopCategoryCut] = useState(10)
  const [cancelSubscriptionId, setCancelSubscriptionId] = useState("none")

  const simulation = useMemo(() => {
    const topCategoryAmount = data.insights.topCategory?.amount ?? 0
    const categoryReduction = topCategoryAmount * (topCategoryCut / 100)
    const cancelledSubscriptionAmount =
      cancelSubscriptionId === "none"
        ? 0
        : (data.subscriptions.items.find((item) => item.id === cancelSubscriptionId)?.amount ?? 0)

    const simulatedExpense = Math.max(
      data.forecast.expectedExpense - categoryReduction - cancelledSubscriptionAmount,
      0
    )
    const simulatedIncome = data.summary.totalIncome + incomeLift
    const simulatedBalance = simulatedIncome - simulatedExpense
    const simulatedSavingsRate = simulatedIncome > 0 ? (simulatedBalance / simulatedIncome) * 100 : 0

    return {
      categoryReduction,
      cancelledSubscriptionAmount,
      simulatedExpense,
      simulatedBalance,
      simulatedSavingsRate,
    }
  }, [cancelSubscriptionId, data, incomeLift, topCategoryCut])

  return (
    <Card className="rounded-[24px] border-white/[0.08] bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Senaryo simulasyonu</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          &quot;Ne olursa?&quot; sorusuna hizli cevap vermek icin basit aylik proje hesabi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-2 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Gelir artisi
            </span>
            <input
              type="number"
              min={0}
              step={500}
              value={incomeLift}
              onChange={(event) => setIncomeLift(Number(event.target.value) || 0)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
            />
          </label>
          <label className="space-y-2 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Top kategori kesintisi
            </span>
            <input
              type="number"
              min={0}
              max={100}
              step={5}
              value={topCategoryCut}
              onChange={(event) => setTopCategoryCut(Number(event.target.value) || 0)}
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
            />
          </label>
          <div className="space-y-2 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Iptal edilen abonelik
            </span>
            <Select value={cancelSubscriptionId} onValueChange={setCancelSubscriptionId}>
              <SelectTrigger className="rounded-xl border-white/[0.08] bg-white/[0.04] backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Abonelik secilmedi</SelectItem>
                {data.subscriptions.items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-4">
            <p className="text-xs text-muted-foreground">Yeni beklenen gider</p>
            <p className="mt-2 text-xl font-semibold">{formatCurrency(simulation.simulatedExpense)}</p>
          </div>
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-4">
            <p className="text-xs text-muted-foreground">Yeni beklenen bakiye</p>
            <p
              className={cn(
                "mt-2 text-xl font-semibold",
                simulation.simulatedBalance >= 0 ? "text-income" : "text-expense"
              )}
            >
              {formatCurrency(simulation.simulatedBalance)}
            </p>
          </div>
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-4">
            <p className="text-xs text-muted-foreground">Yeni tasarruf orani</p>
            <p className="mt-2 text-xl font-semibold">%{simulation.simulatedSavingsRate.toFixed(1)}</p>
          </div>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Simulasyon etkisi: ust kategori kesintisi {formatCurrency(simulation.categoryReduction)}, abonelik iptali{" "}
          {formatCurrency(simulation.cancelledSubscriptionAmount)}, ek gelir {formatCurrency(incomeLift)}.
        </p>
      </CardContent>
    </Card>
  )
}

export function PriorityPanel({ data }: { data: DashboardData }) {
  return (
    <Card className="rounded-[24px] border-white/[0.08] bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Kisisel oncelikler</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Davranis akisinizda en fazla izlenmesi gereken alanlar burada one cekilir.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        {data.personalPriorities.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/80 bg-background/50 p-5 text-center text-sm text-muted-foreground">
            Kisisel oncelik cikarmak icin daha fazla donem verisi gerekli.
          </div>
        ) : (
          data.personalPriorities.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-[18px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export function DashboardPlanningPanels({ data }: { data: DashboardData }) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <CalendarPanel data={data} />
        <SubscriptionPanel data={data} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <DigestPreviewCard data={data} />
        <PriorityPanel data={data} />
      </div>
      <SimulatorCard data={data} />
    </>
  )
}
