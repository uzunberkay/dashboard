"use client"

import dynamic from "next/dynamic"
import { Suspense } from "react"
import { ChartSkeletonCard } from "@/components/dashboard/chart-skeleton-card"
import type { CategoryExpense } from "@/types"

interface CategoryPieChartProps {
  data: CategoryExpense[]
  month: string
}

const CategoryChart = dynamic(
  () => import("@/components/dashboard/category-chart").then((module) => module.CategoryChart),
  {
    ssr: false,
    loading: () => <ChartSkeletonCard title="Kategori dagilimi" />,
  }
)

export function CategoryPieChart({ data, month }: CategoryPieChartProps) {
  return (
    <Suspense fallback={<ChartSkeletonCard title="Kategori dagilimi" />}>
      <CategoryChart data={data} month={month} />
    </Suspense>
  )
}

