"use client"

import { memo, useMemo } from "react"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/dashboard/status-badge"

type BudgetStatus = "safe" | "warning" | "danger"

interface BudgetProgressProps {
  label: string
  spent: number
  limit: number
  status?: BudgetStatus
  className?: string
}

function resolveStatus(percentage: number): BudgetStatus {
  if (percentage >= 100) {
    return "danger"
  }

  if (percentage >= 80) {
    return "warning"
  }

  return "safe"
}

export const BudgetProgress = memo(function BudgetProgress({
  label,
  spent,
  limit,
  status,
  className,
}: BudgetProgressProps) {
  const percentage = useMemo(() => {
    if (limit <= 0) {
      return 0
    }

    return (spent / limit) * 100
  }, [limit, spent])

  const currentStatus = status ?? resolveStatus(percentage)

  const indicatorClassName =
    currentStatus === "danger"
      ? "bg-expense"
      : currentStatus === "warning"
        ? "bg-warning"
        : "bg-income"

  return (
    <div className={cn("space-y-3 rounded-[20px] border border-border/60 bg-background/55 p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{label}</p>
        <StatusBadge
          tone={currentStatus === "danger" ? "danger" : currentStatus === "warning" ? "warning" : "success"}
          label={currentStatus === "danger" ? "Asim" : currentStatus === "warning" ? "Yaklasiyor" : "Normal"}
        />
      </div>

      <Progress value={Math.min(percentage, 100)} indicatorClassName={indicatorClassName} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(spent)}</span>
        <span>%{Math.round(percentage)}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Limit: {formatCurrency(limit)}</span>
        <span>
          {spent <= limit
            ? `Kalan ${formatCurrency(limit - spent)}`
            : `${formatCurrency(spent - limit)} asildi`}
        </span>
      </div>
    </div>
  )
})
