"use client"

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import type { BudgetStatus } from "@/types"

interface BudgetProgressProps {
  budgets: BudgetStatus[]
}

function getStatusColor(percentage: number) {
  if (percentage >= 100) {
    return "bg-red-500"
  }

  if (percentage >= 80) {
    return "bg-orange-500"
  }

  if (percentage >= 50) {
    return "bg-yellow-500"
  }

  return "bg-green-500"
}

function getStatusIcon(status: string) {
  if (status === "danger") {
    return <XCircle className="h-5 w-5 text-red-500" />
  }

  if (status === "warning") {
    return <AlertTriangle className="h-5 w-5 text-orange-500" />
  }

  return <CheckCircle className="h-5 w-5 text-green-500" />
}

function getStatusBadge(status: string) {
  if (status === "danger") {
    return <Badge variant="destructive">Asim</Badge>
  }

  if (status === "warning") {
    return <Badge variant="warning">Uyari</Badge>
  }

  return <Badge variant="success">Normal</Badge>
}

export function BudgetProgress({ budgets }: BudgetProgressProps) {
  if (budgets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-10 text-center">
        <p className="text-sm font-medium">Butce limiti belirlenmis kategori bulunamadi.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Kategoriler sayfasindan limit tanimlayarak bu alani aktif hale getirebilirsiniz.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {budgets.map((budget) => (
        <Card key={budget.categoryId} className="rounded-[24px] ">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {getStatusIcon(budget.status)}
                <div>
                  <CardTitle className="text-base">{budget.categoryName}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {budget.parentName ? `${budget.parentName} altinda izleniyor.` : "Ana kategori seviyesi."}
                  </p>
                </div>
              </div>
              {getStatusBadge(budget.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatCurrency(budget.totalSpent)} / {formatCurrency(budget.budgetLimit)}
              </span>
              <span className="font-medium">%{Math.min(Math.round(budget.percentage), 999)}</span>
            </div>
            <Progress
              value={Math.min(budget.percentage, 100)}
              indicatorClassName={getStatusColor(budget.percentage)}
              className="h-2.5"
            />
            <p className="text-xs text-muted-foreground">
              {budget.percentage < 100
                ? `Kalan limit: ${formatCurrency(budget.budgetLimit - budget.totalSpent)}`
                : `${formatCurrency(budget.totalSpent - budget.budgetLimit)} kadar limit asildi.`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
