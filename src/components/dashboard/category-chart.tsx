"use client"

import { memo, useMemo, useState } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import { CategoryDetailModal } from "@/components/dashboard/category-detail-modal"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { CategoryExpense } from "@/types"

interface CategoryChartProps {
  data: CategoryExpense[]
  month: string
}

export const CategoryChart = memo(function CategoryChart({ data, month }: CategoryChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryExpense | null>(null)

  const sortedData = useMemo(
    () =>
      [...data]
        .filter((item) => item.value > 0)
        .sort((first, second) => second.value - first.value),
    [data]
  )

  const total = useMemo(
    () => sortedData.reduce((sum, item) => sum + item.value, 0),
    [sortedData]
  )

  return (
    <>
      <Card className="h-full rounded-[24px]">
        <CardHeader className="space-y-1 p-5">
          <CardTitle className="text-base font-semibold">Kategori dagilimi</CardTitle>
          <p className="text-xs text-muted-foreground">
            Toplam gider: {formatCurrency(total)} · Detay icin kategoriye tiklayin.
          </p>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {sortedData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] text-sm text-muted-foreground">
              Kategori grafigi icin veri bulunmuyor.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sortedData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={108}
                    paddingAngle={3}
                    onClick={(_, index) => {
                      const nextCategory = sortedData[index]
                      if (nextCategory) {
                        setSelectedCategory(nextCategory)
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {sortedData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid var(--glass-border)",
                      backgroundColor: "var(--glass-bg-strong)",
                      backdropFilter: "blur(24px)",
                      boxShadow: "var(--glass-shadow-lg)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-2">
                {sortedData.slice(0, 6).map((entry) => {
                  const percentage = total === 0 ? 0 : (entry.value / total) * 100
                  return (
                    <button
                      key={entry.id}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-3 text-left backdrop-blur-sm transition-all hover:bg-white/[0.08]"
                      onClick={() => setSelectedCategory(entry)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: entry.fill }}
                          />
                          <span className="truncate text-sm font-medium">{entry.name}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">%{Math.round(percentage)}</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatCurrency(entry.value)}</span>
                          <span>Pay orani</span>
                        </div>
                        <Progress
                          value={percentage}
                          indicatorClassName="bg-primary"
                          className="h-2.5 bg-primary/10"
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDetailModal
        category={selectedCategory}
        month={month}
        open={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
      />
    </>
  )
})
