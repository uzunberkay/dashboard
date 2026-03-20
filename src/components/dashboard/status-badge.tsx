"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type StatusTone = "income" | "expense" | "warning" | "neutral" | "success" | "danger"

interface StatusBadgeProps {
  tone: StatusTone
  label?: string
  className?: string
}

const toneClasses: Record<StatusTone, string> = {
  income:
    "border-transparent bg-income/15 text-income dark:bg-income/20 dark:text-income",
  expense:
    "border-transparent bg-expense/15 text-expense dark:bg-expense/20 dark:text-expense",
  warning:
    "border-transparent bg-warning/20 text-yellow-900 dark:bg-warning/25 dark:text-warning",
  neutral:
    "border-transparent bg-neutral/15 text-neutral dark:bg-neutral/20 dark:text-neutral",
  success:
    "border-transparent bg-income/15 text-income dark:bg-income/20 dark:text-income",
  danger:
    "border-transparent bg-expense/15 text-expense dark:bg-expense/20 dark:text-expense",
}

const defaultLabel: Record<StatusTone, string> = {
  income: "Gelir",
  expense: "Gider",
  warning: "Uyari",
  neutral: "Notr",
  success: "Normal",
  danger: "Kritik",
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <Badge className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium", toneClasses[tone], className)}>
      {label ?? defaultLabel[tone]}
    </Badge>
  )
}

