"use client"

import { Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { TransactionWithCategory } from "@/types"

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  onEdit: (t: TransactionWithCategory) => void
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-6 py-12 text-center">
        <p className="text-sm font-medium">Bu filtrelere uygun islem bulunamadi.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Filtreleri genisleterek veya yeni kayit ekleyerek listeyi doldurabilirsiniz.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const isIncome = transaction.type === "INCOME"

        return (
          <div
            key={transaction.id}
            className="group flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm transition-all hover:bg-white/[0.08]"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl backdrop-blur-sm ${
                isIncome
                  ? "bg-income/15 text-income shadow-income/10 dark:bg-income/20"
                  : "bg-expense/15 text-expense shadow-expense/10 dark:bg-expense/20"
              }`}
            >
              {isIncome ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {transaction.description || (isIncome ? "Gelir" : "Harcama")}
                </p>
                {transaction.category ? (
                  <Badge variant="secondary" className="shrink-0 rounded-full text-[11px]">
                    {transaction.category.name}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
            </div>

            <p
              className={`whitespace-nowrap text-sm font-bold ${
                isIncome ? "text-income" : "text-expense"
              }`}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </p>

            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => onEdit(transaction)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                onClick={() => onDelete(transaction.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
