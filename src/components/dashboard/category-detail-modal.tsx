"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { fetchJsonWithCache } from "@/lib/client-fetch"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { CategoryExpense, TransactionWithCategory } from "@/types"

interface CategoryDetailModalProps {
  category: CategoryExpense | null
  month: string
  open: boolean
  onClose: () => void
}

export function CategoryDetailModal({ category, month, open, onClose }: CategoryDetailModalProps) {
  const [fetchedTransactions, setFetchedTransactions] = useState<TransactionWithCategory[]>([])
  const [loading, setLoading] = useState(false)
  const transactions = open && category ? fetchedTransactions : []

  useEffect(() => {
    if (!open || !category) {
      return
    }

    const loadTransactions = async () => {
      setLoading(true)
      const params = new URLSearchParams({ month, type: "EXPENSE" })

      try {
        const data = await fetchJsonWithCache<TransactionWithCategory[]>(
          `/api/transactions?${params}`,
          { ttlMs: 12000 }
        )
        const filtered = data.filter(
          (transaction) => transaction.categoryId && category.categoryIds.includes(transaction.categoryId)
        )
        setFetchedTransactions(filtered)
      } catch {
        setFetchedTransactions([])
      } finally {
        setLoading(false)
      }
    }

    void loadTransactions()
  }, [open, category, month])

  if (!category) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: category.fill }}
            />
            {category.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Toplam: {formatCurrency(category.value)} &middot; {transactions.length} işlem
          </p>
        </DialogHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading ? (
            <div className="space-y-3 py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-32 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Bu kategoride işlem bulunamadı.
            </p>
          ) : (
            <div className="space-y-1 py-2">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-2.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: category.fill }}
                    >
                      {(t.description || t.category?.name || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {t.description || "İşlem"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(t.date)}
                        </span>
                        {t.category && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {t.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-red-600 shrink-0 ml-3">
                    -{formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
