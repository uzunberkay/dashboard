"use client"

import { Card, CardContent } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="space-y-4 rounded-[28px] border border-white/[0.08] bg-card/50 p-6 backdrop-blur-xl">
        <div className="space-y-2">
          <div className="h-4 w-36 rounded-lg glass-skeleton" />
          <div className="h-10 w-72 rounded-lg glass-skeleton" />
          <div className="h-4 w-full max-w-2xl rounded-lg glass-skeleton" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 rounded-2xl glass-skeleton" />
          ))}
        </div>
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden rounded-[24px]">
            <CardContent className="space-y-3 p-5">
              <div className="h-4 w-28 rounded-lg glass-skeleton" />
              <div className="h-8 w-40 rounded-lg glass-skeleton" />
              <div className="h-4 w-32 rounded-lg glass-skeleton" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart skeletons */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-[24px]">
          <CardContent className="h-[360px] p-5">
            <div className="h-full w-full rounded-2xl glass-skeleton" />
          </CardContent>
        </Card>
        <Card className="rounded-[24px]">
          <CardContent className="h-[360px] p-5">
            <div className="h-full w-full rounded-2xl glass-skeleton" />
          </CardContent>
        </Card>
      </div>

      {/* Panel skeletons */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[24px]">
          <CardContent className="h-[360px] p-5">
            <div className="h-full w-full rounded-2xl glass-skeleton" />
          </CardContent>
        </Card>
        <Card className="rounded-[24px]">
          <CardContent className="h-[360px] p-5">
            <div className="h-full w-full rounded-2xl glass-skeleton" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
