"use client"

import dynamic from "next/dynamic"
import type { AdminTrendPoint } from "@/types/admin"

const DynamicAdminTrendChart = dynamic(
  () => import("@/components/admin/admin-trend-chart").then((module) => module.AdminTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] rounded-2xl border border-white/[0.08] bg-card/50 backdrop-blur-xl glass-skeleton" />
    ),
  }
)

interface AdminTrendChartPanelProps {
  data: AdminTrendPoint[]
}

export function AdminTrendChartPanel({ data }: AdminTrendChartPanelProps) {
  return <DynamicAdminTrendChart data={data} />
}
