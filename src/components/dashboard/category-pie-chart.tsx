"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrency } from "@/lib/utils"
import { CategoryDetailModal } from "@/components/dashboard/category-detail-modal"
import type { CategoryExpense } from "@/types"

interface CategoryPieChartProps {
  data: CategoryExpense[]
  month: string
}

export function CategoryPieChart({ data, month }: CategoryPieChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryExpense | null>(null)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground text-sm">Henüz harcama verisi yok</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategori Dağılımı</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                style={{ cursor: "pointer" }}
                onClick={(_, index) => setSelectedCategory(data[index])}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Detay için kategoriye tıklayın
          </p>
        </CardContent>
      </Card>

      <CategoryDetailModal
        category={selectedCategory}
        month={month}
        open={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
      />
    </>
  )
}
