"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminTrendPoint } from "@/types/admin"

interface AdminTrendChartProps {
  data: AdminTrendPoint[]
}

export function AdminTrendChart({ data }: AdminTrendChartProps) {
  const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  })

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-lg">Son 14 gun platform trendi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="transactionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={42} />
              <Tooltip
                formatter={(value, name) => [value, name]}
                labelFormatter={(value) => dateFormatter.format(new Date(String(value)))}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  backgroundColor: "var(--glass-bg-strong)",
                  backdropFilter: "blur(24px)",
                  boxShadow: "var(--glass-shadow-lg)",
                  color: "var(--foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                name="Islemler"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#transactionsGradient)"
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="logins"
                name="Girisler"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="newUsers"
                name="Yeni kullanicilar"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={false}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
