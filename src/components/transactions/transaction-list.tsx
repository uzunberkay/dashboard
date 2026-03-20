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
      <div className="flex min-h-48 flex-col items-center justify-center rounded-[22px] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
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
            className="group flex items-center gap-4 rounded-[22px] border border-border/70 bg-background/65 p-4 transition-colors hover:bg-accent/40"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isIncome
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
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
              className={`whitespace-nowrap text-sm font-semibold ${
                isIncome ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
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
