"use client"

import dynamic from "next/dynamic"
import type { AdminTrendPoint } from "@/types/admin"

const DynamicAdminTrendChart = dynamic(
  () => import("@/components/admin/admin-trend-chart").then((module) => module.AdminTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] animate-pulse rounded-[24px] border border-border/70 bg-card/70" />
    ),
  }
)

interface AdminTrendChartPanelProps {
  data: AdminTrendPoint[]
}

export function AdminTrendChartPanel({ data }: AdminTrendChartPanelProps) {
  return <DynamicAdminTrendChart data={data} />
}
