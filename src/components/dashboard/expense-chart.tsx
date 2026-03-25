"use client"

import { memo, useMemo } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { DailyExpense, DashboardPeakExpenseDay } from "@/types"

interface ExpenseChartProps {
  data: DailyExpense[]
  dailyAverage?: number
  peakExpenseDay?: DashboardPeakExpenseDay | null
}

export const ExpenseChart = memo(function ExpenseChart({
  data,
  dailyAverage = 0,
  peakExpenseDay = null,
}: ExpenseChartProps) {
  const formattedData = useMemo(
    () =>
      data.map((item) => {
        const date = new Date(item.date)
        return {
          ...item,
          dayLabel: date.getDate().toString(),
        }
      }),
    [data]
  )

  const totalExpense = useMemo(
    () => formattedData.reduce((total, item) => total + item.amount, 0),
    [formattedData]
  )
  const peakDayLabel = useMemo(() => {
    if (!peakExpenseDay) {
      return null
    }

    return new Date(peakExpenseDay.date).getDate().toString()
  }, [peakExpenseDay])

  return (
    <Card className="h-full rounded-[24px]">
      <CardHeader className="space-y-3 p-5">
        <CardTitle className="text-base font-semibold">Aylik harcama trendi</CardTitle>
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Toplam
            </p>
            <p className="mt-1 text-sm font-bold text-expense">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Gunluk ortalama
            </p>
            <p className="mt-1 text-sm font-bold">{formatCurrency(dailyAverage)}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Zirve gun
            </p>
            <p className="mt-1 text-sm font-bold">
              {peakExpenseDay ? formatDate(peakExpenseDay.date) : "Veri yok"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {formattedData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-muted-foreground">
            Grafik icin yeterli harcama verisi bulunmuyor.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formattedData} margin={{ left: 8, right: 8, top: 16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" opacity={0.35} />
              <ReferenceLine
                y={dailyAverage}
                stroke="var(--warning)"
                strokeDasharray="6 6"
                ifOverflow="extendDomain"
              />
              <XAxis
                dataKey="dayLabel"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
              />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                labelFormatter={(label) => `${label}. gun`}
                formatter={(value) => [formatCurrency(Number(value)), "Harcama"]}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid var(--glass-border)",
                  backgroundColor: "var(--glass-bg-strong)",
                  backdropFilter: "blur(24px)",
                  boxShadow: "var(--glass-shadow-lg)",
                }}
              />
              {peakExpenseDay && peakDayLabel ? (
                <ReferenceDot
                  x={peakDayLabel}
                  y={peakExpenseDay.amount}
                  r={5}
                  fill="var(--expense)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="amount"
                stroke="var(--expense)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "var(--expense)",
                  stroke: "var(--card)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
})
