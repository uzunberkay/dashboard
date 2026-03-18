"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import type { BudgetStatus } from "@/types"

interface BudgetProgressProps {
  budgets: BudgetStatus[]
}

function getStatusColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500"
  if (percentage >= 80) return "bg-orange-500"
  if (percentage >= 50) return "bg-yellow-500"
  return "bg-green-500"
}

function getStatusIcon(status: string) {
  switch (status) {
    case "danger":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    default:
      return <CheckCircle className="h-5 w-5 text-green-500" />
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "danger":
      return <Badge variant="destructive">Aşım</Badge>
    case "warning":
      return <Badge variant="warning">Uyarı</Badge>
    default:
      return <Badge variant="success">Normal</Badge>
  }
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  if (budgets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Bütçe limiti belirlenmiş kategori bulunamadı.</p>
        <p className="text-sm mt-1">Kategoriler sayfasından bütçe limiti belirleyebilirsiniz.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {budgets.map((b) => (
        <Card key={b.categoryId}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(b.status)}
                <CardTitle className="text-base">{b.categoryName}</CardTitle>
              </div>
              {getStatusBadge(b.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {formatCurrency(b.totalSpent)} / {formatCurrency(b.budgetLimit)}
                </span>
                <span className="font-medium">
                  %{Math.min(Math.round(b.percentage), 999)}
                </span>
              </div>
              <Progress
                value={Math.min(b.percentage, 100)}
                indicatorClassName={getStatusColor(b.percentage)}
              />
              {b.percentage < 100 && (
                <p className="text-xs text-muted-foreground">
                  Kalan: {formatCurrency(b.budgetLimit - b.totalSpent)}
                </p>
              )}
              {b.percentage >= 100 && (
                <p className="text-xs text-red-500 font-medium">
                  {formatCurrency(b.totalSpent - b.budgetLimit)} aşım!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
