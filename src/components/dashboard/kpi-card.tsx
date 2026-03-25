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

const toneStyles: Record<KpiTone, { icon: string; value: string; ring: string; glow: string }> = {
  income: {
    icon: "bg-income/15 text-income shadow-income/10 dark:bg-income/20",
    value: "text-income",
    ring: "from-income/25 via-income/8 to-transparent",
    glow: "bg-income/8",
  },
  expense: {
    icon: "bg-expense/15 text-expense shadow-expense/10 dark:bg-expense/20",
    value: "text-expense",
    ring: "from-expense/25 via-expense/8 to-transparent",
    glow: "bg-expense/8",
  },
  warning: {
    icon: "bg-warning/20 text-yellow-900 shadow-warning/10 dark:bg-warning/25 dark:text-warning",
    value: "text-yellow-800 dark:text-warning",
    ring: "from-warning/30 via-warning/8 to-transparent",
    glow: "bg-warning/8",
  },
  neutral: {
    icon: "bg-neutral/15 text-neutral shadow-neutral/10 dark:bg-neutral/20",
    value: "text-foreground",
    ring: "from-primary/25 via-primary/8 to-transparent",
    glow: "bg-primary/6",
  },
}

const trendToneClasses: Record<TrendTone, string> = {
  positive: "bg-income/12 text-income backdrop-blur-sm",
  negative: "bg-expense/12 text-expense backdrop-blur-sm",
  neutral: "bg-neutral/12 text-neutral backdrop-blur-sm",
  warning: "bg-warning/15 text-yellow-900 backdrop-blur-sm dark:text-warning",
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
    <Card className="group relative overflow-hidden rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--glass-shadow-lg)]">
      {/* Gradient overlay */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${colors.ring}`} />
      {/* Glow spot */}
      <div className={cn("pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100 opacity-60", colors.glow)} />

      <CardHeader className="relative flex flex-row items-start justify-between space-y-0 p-5 pb-3">
        <div className="space-y-1.5">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </CardTitle>
          {trendLabel ? (
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", trendToneClasses[trendTone])}>
              {trendLabel}
            </span>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-2xl shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110",
            colors.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent className="relative space-y-1 p-5 pt-0">
        <p className={cn("text-[2rem] font-bold tracking-tight drop-shadow-sm", colors.value)}>{value}</p>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </CardContent>
    </Card>
  )
})
