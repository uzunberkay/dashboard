"use client"

import { Card, CardContent } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-border/70 bg-card/70 p-6">
        <div className="space-y-2">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-10 w-72 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-[22px] bg-background/80" />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="space-y-3 p-5">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-8 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="h-[360px] animate-pulse p-5" />
        </Card>
        <Card>
          <CardContent className="h-[360px] animate-pulse p-5" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="h-[360px] animate-pulse p-5" />
        </Card>
        <Card>
          <CardContent className="h-[360px] animate-pulse p-5" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="h-[360px] animate-pulse p-5" />
        </Card>
        <Card>
          <CardContent className="h-[360px] animate-pulse p-5" />
        </Card>
      </div>
    </div>
  )
}
