"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react"
import type { TransactionWithCategory } from "@/types"

interface RecentTransactionsProps {
  transactions: TransactionWithCategory[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Son İşlemler</CardTitle>
        <Link href="/transactions">
          <Button variant="ghost" size="sm">
            Tümünü Gör <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Henüz işlem yok
          </p>
        ) : (
          <div className="space-y-3">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  t.type === "INCOME"
                    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                }`}>
                  {t.type === "INCOME" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {t.description || (t.type === "INCOME" ? "Gelir" : "Harcama")}
                    </p>
                    {t.category && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {t.category.name}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <p className={`text-sm font-semibold whitespace-nowrap ${
                  t.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
