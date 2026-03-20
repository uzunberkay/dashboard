"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { ChartSkeletonCard } from "@/components/dashboard/chart-skeleton-card"
import type { DailyExpense } from "@/types"

interface MonthlyLineChartProps {
  data: DailyExpense[]
}

const ExpenseChart = dynamic(
  () => import("@/components/dashboard/expense-chart").then((module) => module.ExpenseChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonCard title="Aylik harcama trendi" />,
  }
)

export function MonthlyLineChart({ data }: MonthlyLineChartProps) {
  return (
    <Suspense fallback={<ChartSkeletonCard title="Aylik harcama trendi" />}>
      <ExpenseChart data={data} />
    </Suspense>
  )
}

