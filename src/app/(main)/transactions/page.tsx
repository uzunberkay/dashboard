"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, Compass, Plus } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { PageHero } from "@/components/shared/page-hero"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { TransactionList } from "@/components/transactions/transaction-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { fetchJsonWithCache, invalidateClientFetchCache } from "@/lib/client-fetch"
import type {
  DashboardData,
  PaginatedTransactionsResponse,
  TransactionPagination,
  TransactionType,
  TransactionWithCategory,
} from "@/types"

interface Category {
  id: string
  name: string
  children?: { id: string; name: string }[]
}

type TransactionsSnapshot = Pick<DashboardData, "summary" | "period" | "activity">

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [dashboardSnapshot, setDashboardSnapshot] = useState<TransactionsSnapshot | null>(null)
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

  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  )
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const queryMonth = searchParams.get("month")
  const queryType = searchParams.get("type")
  const queryCategory = searchParams.get("category")
  const focus = searchParams.get("focus")

  useEffect(() => {
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) {
      setMonth(queryMonth)
    }

    if (queryType === "INCOME" || queryType === "EXPENSE") {
      setTypeFilter(queryType)
    }

    if (queryCategory) {
      setCategoryFilter(queryCategory)
    }

    if (queryMonth || queryType || queryCategory) {
      setPage(1)
    }
  }, [queryCategory, queryMonth, queryType])

  const fetchTransactions = useCallback(async (options?: { force?: boolean }) => {
    const { force = false } = options ?? {}
    setLoading(true)

    const params = new URLSearchParams()
    params.set("month", month)
    params.set("page", String(page))

    if (typeFilter !== "all") {
      params.set("type", typeFilter)
    }

    if (categoryFilter !== "all") {
      params.set("category", categoryFilter)
    }

    try {
      const [transactionsData, dashboardData] = await Promise.all([
        fetchJsonWithCache<PaginatedTransactionsResponse>(`/api/transactions?${params.toString()}`, {
          force,
          ttlMs: 15000,
        }),
        fetchJsonWithCache<TransactionsSnapshot>(`/api/dashboard?month=${month}`, {
          force,
          ttlMs: 15000,
        }),
      ])

      setTransactions(transactionsData.items)
      setPagination(transactionsData.pagination)
      setDashboardSnapshot(dashboardData)

      if (transactionsData.pagination.page > transactionsData.pagination.totalPages) {
        setPage(transactionsData.pagination.totalPages)
        return
      }
    } catch {
      setTransactions([])
      setDashboardSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, month, page, typeFilter])

  useEffect(() => {
    void fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    void fetchJsonWithCache<Category[]>("/api/categories", { ttlMs: 30000 })
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  async function handleDelete(id: string) {
    if (!confirm("Bu islemi silmek istediginize emin misiniz?")) {
      return
    }

    const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
    if (response.ok) {
      toast({ title: "Islem silindi", variant: "success" })
      invalidateClientFetchCache(["/api/transactions", "/api/dashboard", "/api/goals/summary"])
      void fetchTransactions({ force: true })
    }
  }

  function handleEdit(transaction: TransactionWithCategory) {
    setEditData(transaction)
    setFormOpen(true)
  }

  function handleNew() {
    setEditData(null)
    setFormOpen(true)
  }

  function resetFilters() {
    setTypeFilter("all")
    setCategoryFilter("all")
    setPage(1)
  }

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
        return {
          value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          label: date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }),
        }
      }),
    [now]
  )

  const hasActiveFilters = typeFilter !== "all" || categoryFilter !== "all"
  const selectedCategoryName =
    categoryFilter === "all"
      ? "Tum kategoriler"
      : categories.find((category) => category.id === categoryFilter)?.name ?? "Secili kategori"

  const focusMeta = useMemo(() => {
    if (!focus) {
      return null
    }

    if (focus === "income-drop") {
      return {
        title: "Gelir dususu odagi",
        description:
          "Dashboard sizi gelir akisinizdaki yavaslamayi incelemek icin bu gorunume yonlendirdi.",
      }
    }

    if (focus === "category-pressure") {
      return {
        title: "Kategori baskisi odagi",
        description:
          "Bu liste, toplam gideri baskilayan kategori hareketlerini acikca gormeniz icin filtrelendi.",
      }
    }

    return {
      title: "Dashboard odagi",
      description:
        "Bu gorunum, dashboard aksiyon merkezinden gelen yonlendirme ile otomatik filtrelendi.",
    }
  }, [focus])

  const heroStats = dashboardSnapshot
    ? [
        {
          label: "Secili donem",
          value: dashboardSnapshot.period.label,
          helper: "Ay bazli hareketleriniz bu filtreyle okunur.",
        },
        {
          label: "Toplam kayit",
          value: new Intl.NumberFormat("tr-TR").format(dashboardSnapshot.activity.transactionCount),
          helper: `${dashboardSnapshot.activity.expenseCount} gider ve ${dashboardSnapshot.activity.incomeCount} gelir kaydi var.`,
        },
        {
          label: "Gelir toplami",
          value: new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
            minimumFractionDigits: 2,
          }).format(dashboardSnapshot.summary.totalIncome),
          helper: "Secili ay icindeki tum gelirler.",
          tone: "success" as const,
        },
        {
          label: "Gider toplami",
          value: new Intl.NumberFormat("tr-TR", {
            style: "currency",
            currency: "TRY",
            minimumFractionDigits: 2,
          }).format(dashboardSnapshot.summary.totalExpense),
          helper: "Secili ay icindeki tum giderler.",
          tone: "danger" as const,
        },
      ]
    : [
        {
          label: "Secili donem",
          value: month,
          helper: "Ay bazli hareketleriniz burada listelenir.",
        },
      ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Islem merkezi"
        title="Gelir ve gider hareketleri"
        description="Kayitlari tek ekranda filtreleyin, duzenleyin ve secili ay icindeki finans akisinizin ayrintilarini hizla takip edin."
        actions={(
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" />
            Yeni islem
          </Button>
        )}
        stats={heroStats}
      />

      <Card className="rounded-[24px]">
        <CardHeader className="space-y-1 p-5">
          <CardTitle className="text-base font-semibold">Filtreler</CardTitle>
          <p className="text-xs text-muted-foreground">
            Donem, islem tipi ve kategori secerek listeyi daraltin.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          {focusMeta ? (
            <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{focusMeta.title}</p>
                <StatusBadge tone="neutral" label="Dashboard baglami" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{focusMeta.description}</p>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_180px_220px_auto]">
            <Select
              value={month}
              onValueChange={(value) => {
                setMonth(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum tipler</SelectItem>
                <SelectItem value="INCOME">Gelir</SelectItem>
                <SelectItem value="EXPENSE">Gider</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value)
                setPage(1)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tum kategoriler</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 md:justify-end">
              <Button variant="outline" onClick={resetFilters} disabled={!hasActiveFilters}>
                Filtreleri temizle
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm">
            {hasActiveFilters
              ? `${selectedCategoryName} ve ${typeFilter === "all" ? "tum tipler" : typeFilter === "INCOME" ? "sadece gelir" : "sadece gider"} filtresi aktif. Bu kayitlar secili dashboard baglamini aciklamak icin daraltildi.`
              : "Tum tipler ve tum kategoriler goruntuleniyor."}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-[24px]">
          <CardContent className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 rounded-2xl glass-skeleton"
              />
            ))}
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card className="rounded-[24px]">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <ArrowLeftRight className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Bu gorunumde kayit bulunmuyor</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Filtreler cok dar kalmis olabilir. Filtreleri temizleyerek tum islem akisina donebilirsiniz."
                : "Secili ayda henuz gelir veya gider kaydi yok. Ilk kaydinizi ekleyerek listeyi baslatin."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4" />
                Yeni islem
              </Button>
              {hasActiveFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  Filtreleri temizle
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[24px]">
          <CardHeader className="space-y-1 p-5">
            <CardTitle className="text-base font-semibold">Islem listesi</CardTitle>
            <p className="text-xs text-muted-foreground">
              Sayfalanmis liste uzerinden kayitlari duzenleyebilir veya silebilirsiniz.
            </p>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <TransactionList transactions={transactions} onEdit={handleEdit} onDelete={handleDelete} />
          </CardContent>
          {pagination.total > 0 ? (
            <CardFooter className="flex flex-col gap-3 border-t border-white/[0.08] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Toplam {pagination.total} islem / Sayfa {pagination.page} / {pagination.totalPages}
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
            </CardFooter>
          ) : null}
        </Card>
      )}

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
        }}
        onSuccess={() => {
          invalidateClientFetchCache(["/api/transactions", "/api/dashboard", "/api/goals/summary"])
          void fetchTransactions({ force: true })
        }}
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
