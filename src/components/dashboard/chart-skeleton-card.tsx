"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ChartSkeletonCardProps {
  title: string
}

export function ChartSkeletonCard({ title }: ChartSkeletonCardProps) {
  return (
    <Card className="h-full rounded-[24px]">
      <CardHeader className="space-y-1 p-5">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <div className="h-3 w-24 rounded-lg glass-skeleton" />
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="h-[300px] rounded-2xl glass-skeleton" />
      </CardContent>
    </Card>
  )
}
