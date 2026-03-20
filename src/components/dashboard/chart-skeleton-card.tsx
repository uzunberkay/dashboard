"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartSkeletonCardProps {
  title: string
}

export function ChartSkeletonCard({ title }: ChartSkeletonCardProps) {
  return (
    <Card className="h-full border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="h-[300px] animate-pulse rounded-xl border border-border/60 bg-muted/30" />
      </CardContent>
    </Card>
  )
}

