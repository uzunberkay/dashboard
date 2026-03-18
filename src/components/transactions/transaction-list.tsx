"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Pencil, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import type { TransactionWithCategory } from "@/types"

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  onEdit: (t: TransactionWithCategory) => void
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Bu filtrelere uygun işlem bulunamadı.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            t.type === "INCOME"
              ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
          }`}>
            {t.type === "INCOME" ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">
                {t.description || (t.type === "INCOME" ? "Gelir" : "Harcama")}
              </p>
              {t.category && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {t.category.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{formatDate(t.date)}</p>
          </div>
          <p className={`text-sm font-semibold whitespace-nowrap ${
            t.type === "INCOME" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}>
            {t.type === "INCOME" ? "+" : "-"}{formatCurrency(t.amount)}
          </p>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(t)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(t.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
