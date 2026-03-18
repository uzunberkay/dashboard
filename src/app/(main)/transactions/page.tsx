"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { TransactionList } from "@/components/transactions/transaction-list"
import { toast } from "@/hooks/use-toast"
import { Plus, ArrowLeftRight } from "lucide-react"
import type {
  PaginatedTransactionsResponse,
  TransactionPagination,
  TransactionWithCategory,
  TransactionType,
} from "@/types"

interface Category {
  id: string
  name: string
  children?: { id: string; name: string }[]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editData, setEditData] = useState<TransactionWithCategory | null>(null)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<TransactionPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  })

  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (month) params.set("month", month)
    if (typeFilter !== "all") params.set("type", typeFilter)
    if (categoryFilter !== "all") params.set("category", categoryFilter)
    params.set("page", String(page))

    const res = await fetch(`/api/transactions?${params}`)
    if (res.ok) {
      const data: PaginatedTransactionsResponse = await res.json()
      setTransactions(data.items)
      setPagination(data.pagination)

      if (data.pagination.page > data.pagination.totalPages) {
        setPage(data.pagination.totalPages)
        return
      }
    }
    setLoading(false)
  }, [categoryFilter, month, page, typeFilter])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTransactions()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchTransactions])

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories)
  }, [])

  async function handleDelete(id: string) {
    if (!confirm("Bu işlemi silmek istediğinize emin misiniz?")) return

    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "İşlem silindi", variant: "success" })
      fetchTransactions()
    }
  }

  function handleEdit(t: TransactionWithCategory) {
    setEditData(t)
    setFormOpen(true)
  }

  function handleNew() {
    setEditData(null)
    setFormOpen(true)
  }

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">İşlemler</h1>
          <p className="text-muted-foreground">Gelir ve harcamalarınızı yönetin</p>
        </div>
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni İşlem
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={month}
          onValueChange={(value) => {
            setMonth(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => {
            setTypeFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="INCOME">Gelir</SelectItem>
            <SelectItem value="EXPENSE">Harcama</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter}
          onValueChange={(value) => {
            setCategoryFilter(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Kategoriler</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="h-3 w-20 rounded bg-muted" />
                  </div>
                  <div className="h-4 w-20 rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ArrowLeftRight className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Henüz işlem yok</h3>
            <p className="text-sm text-muted-foreground mb-4">İlk gelir veya harcamanızı ekleyin</p>
            <Button onClick={handleNew}><Plus className="mr-2 h-4 w-4" />Yeni İşlem</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {pagination.total > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">
                Toplam {pagination.total} islem | Sayfa {pagination.page} / {pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!pagination.hasPreviousPage}
                >
                  Onceki
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditData(null) }}
        onSuccess={fetchTransactions}
        editData={editData ? {
          id: editData.id,
          type: editData.type as TransactionType,
          amount: editData.amount,
          description: editData.description,
          date: editData.date,
          categoryId: editData.categoryId,
        } : null}
      />
    </div>
  )
}
