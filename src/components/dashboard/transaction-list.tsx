"use client"

import { memo } from "react"
import Link from "next/link"
import { ArrowRight, Landmark, TrendingDown, TrendingUp } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { TransactionWithCategory } from "@/types"

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  periodLabel?: string
}

export const TransactionList = memo(function TransactionList({
  transactions,
  periodLabel,
}: TransactionListProps) {
  return (
    <Card className="h-full rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="flex flex-row items-center justify-between gap-3 p-5">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">Son islemler</CardTitle>
          <p className="text-xs text-muted-foreground">
            {periodLabel ? `${periodLabel} icindeki en guncel hareketler.` : "Secili aya ait son hareketler."}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm" className="rounded-lg">
          <Link href="/transactions" prefetch>
            Tumunu gor
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3 p-5 pt-0">
        {transactions.length === 0 ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/30 px-4 text-center">
            <Landmark className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Secili ay icin islem bulunmuyor</p>
            <p className="text-xs text-muted-foreground">
              Yeni gelir veya gider eklendikce burada liste otomatik yenilenir.
            </p>
          </div>
        ) : (
          transactions.map((transaction) => {
            const isIncome = transaction.type === "INCOME"

            return (
              <article
                key={transaction.id}
                className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:bg-muted/40"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    isIncome
                      ? "bg-income/15 text-income dark:bg-income/20"
                      : "bg-expense/15 text-expense dark:bg-expense/20"
                  }`}
                >
                  {isIncome ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {transaction.description || (isIncome ? "Gelir islemi" : "Gider islemi")}
                    </p>
                    <StatusBadge tone={isIncome ? "income" : "expense"} className="shrink-0" />
                    {transaction.category ? (
                      <StatusBadge tone="neutral" label={transaction.category.name} className="shrink-0" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                </div>

                <p className={`shrink-0 text-sm font-semibold ${isIncome ? "text-income" : "text-expense"}`}>
                  {isIncome ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </article>
            )
          })
        )}
      </CardContent>
    </Card>
  )
})
