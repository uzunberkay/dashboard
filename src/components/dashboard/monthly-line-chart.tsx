"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatCurrency } from "@/lib/utils"
import type { DailyExpense } from "@/types"

interface MonthlyLineChartProps {
  data: DailyExpense[]
}

export function MonthlyLineChart({ data }: MonthlyLineChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aylık Harcama Trendi</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">Henüz harcama verisi yok</p>
        </CardContent>
      </Card>
    )
  }

  const formattedData = data.map((d) => ({
    ...d,
    label: new Date(d.date).getDate().toString(),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Aylık Harcama Trendi</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="label"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "Harcama"]}
              labelFormatter={(label) => `Gün ${label}`}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
