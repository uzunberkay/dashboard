import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import type { AdminTopCategory } from "@/types/admin"

interface AdminTopCategoriesPanelProps {
  items: AdminTopCategory[]
}

export function AdminTopCategoriesPanel({ items }: AdminTopCategoriesPanelProps) {
  const maxValue = Math.max(1, ...items.map((item) => item.totalAmount ?? 0))

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Platform capinda yukselen kategoriler</CardTitle>
        <p className="text-sm text-muted-foreground">
          Secili araliktaki harcama yogunlugunun kategori bazli dagilimi.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-muted-foreground">
            Secili filtrede kategori hareketi bulunmuyor.
          </div>
        ) : (
          items.map((item) => {
            const totalAmount = item.totalAmount ?? 0

            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.parentName ? `${item.parentName} | ` : ""}
                      {item.transactionCount} islem
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {item.totalAmount === null ? "Gizli" : formatCurrency(totalAmount)}
                  </p>
                </div>
                <Progress value={(totalAmount / maxValue) * 100} className="h-2.5" />
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
