"use client"

import { CalendarDays, Receipt, Sparkles, Target } from "lucide-react"
import type {
  DashboardHighestExpenseTransaction,
  DashboardPeakExpenseDay,
  DashboardTopCategoryInsight,
} from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"

interface DashboardInsightsPanelProps {
  topCategory: DashboardTopCategoryInsight | null
  highestExpenseTransaction: DashboardHighestExpenseTransaction | null
  peakExpenseDay: DashboardPeakExpenseDay | null
}

interface InsightRowProps {
  title: string
  value: string
  helper: string
  icon: typeof Target
}

function InsightRow({ title, value, helper, icon: Icon }: InsightRowProps) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/55 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-lg font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-xs leading-5 text-muted-foreground">{helper}</p>
        </div>
      </div>
    </div>
  )
}

export function DashboardInsightsPanel({
  topCategory,
  highestExpenseTransaction,
  peakExpenseDay,
}: DashboardInsightsPanelProps) {
  return (
    <Card className="h-full rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">One cikanlar</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Bu ayin karar vermeyi kolaylastiran en net uc sinyali.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 p-5 pt-0">
        <InsightRow
          title="En cok harcama kategorisi"
          value={topCategory ? topCategory.name : "Veri yok"}
          helper={
            topCategory
              ? `${formatCurrency(topCategory.amount)} · toplam giderin %${Math.round(topCategory.share)}i`
              : "Kategori bazli gider olustugunda burada otomatik gorunur."
          }
          icon={Target}
        />
        <InsightRow
          title="En yuksek gider islemi"
          value={
            highestExpenseTransaction
              ? highestExpenseTransaction.description || highestExpenseTransaction.categoryName || "Gider islemi"
              : "Veri yok"
          }
          helper={
            highestExpenseTransaction
              ? `${formatCurrency(highestExpenseTransaction.amount)} · ${formatDate(highestExpenseTransaction.date)}`
              : "Buyuk tutarli giderler burada takip edilir."
          }
          icon={Receipt}
        />
        <InsightRow
          title="En yogun harcama gunu"
          value={peakExpenseDay ? formatDate(peakExpenseDay.date) : "Veri yok"}
          helper={
            peakExpenseDay
              ? `${formatCurrency(peakExpenseDay.amount)} harcama kaydedildi`
              : "Gunluk gider yogunlugu olustugunda burada isaretlenir."
          }
          icon={CalendarDays}
        />
      </CardContent>
    </Card>
  )
}
