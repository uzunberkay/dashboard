"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, XCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { BudgetStatus } from "@/types"

interface BudgetAlertsProps {
  budgets: BudgetStatus[]
}

export function BudgetAlerts({ budgets }: BudgetAlertsProps) {
  const alerts = budgets.filter((b) => b.status === "warning" || b.status === "danger")

  if (alerts.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bütçe Uyarıları</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((b) => (
          <div
            key={b.categoryId}
            className={`flex items-start gap-3 rounded-lg p-3 ${
              b.status === "danger"
                ? "bg-red-50 dark:bg-red-950/50"
                : "bg-yellow-50 dark:bg-yellow-950/50"
            }`}
          >
            {b.status === "danger" ? (
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${
                b.status === "danger" ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"
              }`}>
                {b.status === "danger"
                  ? `${b.categoryName} bütçenizi aştınız!`
                  : `${b.categoryName} bütçenizin %${Math.round(b.percentage)}'ini kullandınız.`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(b.totalSpent)} / {formatCurrency(b.budgetLimit)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
