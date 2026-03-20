"use client"

import { memo } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type KpiTone = "income" | "expense" | "warning" | "neutral"
type TrendTone = "positive" | "negative" | "neutral" | "warning"

interface KpiCardProps {
  title: string
  value: string
  icon: LucideIcon
  tone?: KpiTone
  description?: string
  trendLabel?: string
  trendTone?: TrendTone
}

const toneStyles: Record<KpiTone, { icon: string; value: string; ring: string }> = {
  income: {
    icon: "bg-income/15 text-income dark:bg-income/20",
    value: "text-income",
    ring: "from-income/20 via-income/5 to-transparent",
  },
  expense: {
    icon: "bg-expense/15 text-expense dark:bg-expense/20",
    value: "text-expense",
    ring: "from-expense/20 via-expense/5 to-transparent",
  },
  warning: {
    icon: "bg-warning/20 text-yellow-900 dark:bg-warning/25 dark:text-warning",
    value: "text-yellow-800 dark:text-warning",
    ring: "from-warning/25 via-warning/5 to-transparent",
  },
  neutral: {
    icon: "bg-neutral/15 text-neutral dark:bg-neutral/20",
    value: "text-foreground",
    ring: "from-primary/20 via-primary/5 to-transparent",
  },
}

const trendToneClasses: Record<TrendTone, string> = {
  positive: "bg-income/15 text-income",
  negative: "bg-expense/15 text-expense",
  neutral: "bg-neutral/15 text-neutral",
  warning: "bg-warning/20 text-yellow-900 dark:text-warning",
}

export const KpiCard = memo(function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  description,
  trendLabel,
  trendTone = "neutral",
}: KpiCardProps) {
  const colors = toneStyles[tone]

  return (
    <Card className="group relative overflow-hidden rounded-[24px] border-border/70 bg-card/95 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colors.ring}`} />
      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 p-5 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </CardTitle>
          {trendLabel ? (
            <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-medium", trendToneClasses[trendTone])}>
              {trendLabel}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105",
            colors.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="relative space-y-1 p-5 pt-0">
        <p className={cn("text-3xl font-semibold tracking-tight", colors.value)}>{value}</p>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  )
})
