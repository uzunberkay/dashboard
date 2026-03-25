"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { Layers3, Link2, Tags } from "lucide-react"
import { CategoryForm } from "@/components/categories/category-form"
import { PageHero } from "@/components/shared/page-hero"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { fetchJsonWithCache, invalidateClientFetchCache } from "@/lib/client-fetch"
import { formatCurrency } from "@/lib/utils"
import type { DashboardData, MainCategory, SubCategory } from "@/types"

const CategoryTree = dynamic(
  () => import("@/components/categories/category-tree").then((module) => module.CategoryTree),
  { ssr: false }
)

type CategoriesSnapshot = Pick<DashboardData, "recurringRules" | "scheduledPayments" | "subscriptions" | "insights">

export default function CategoriesPage() {
  const [categories, setCategories] = useState<MainCategory[]>([])
  const [dashboardSnapshot, setDashboardSnapshot] = useState<CategoriesSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [addParentId, setAddParentId] = useState<string | null>(null)
  const [addParentName, setAddParentName] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    id: string
    name: string
    budgetLimit: number | null
    isSystem?: boolean
  } | null>(null)

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }, [])

  const fetchCategories = useCallback(async (options?: { force?: boolean }) => {
    const { force = false } = options ?? {}
    setLoading(true)

    try {
      const [categoriesData, dashboardData] = await Promise.all([
        fetchJsonWithCache<MainCategory[]>("/api/categories", {
          force,
          ttlMs: 30000,
        }),
        fetchJsonWithCache<CategoriesSnapshot>(`/api/dashboard?month=${currentMonth}`, {
          force,
          ttlMs: 20000,
        }),
      ])

      setCategories(categoriesData)
      setDashboardSnapshot(dashboardData)
    } catch {
      setCategories([])
      setDashboardSnapshot(null)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  async function handleReorder(categoryId: string, newParentId: string, newSortOrder: number) {
    const res = await fetch("/api/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, newParentId, newSortOrder }),
    })

    if (res.ok) {
      invalidateClientFetchCache(["/api/categories", "/api/dashboard"])
      void fetchCategories({ force: true })
    } else {
      toast({ title: "Hata", description: "Siralama guncellenemedi.", variant: "destructive" })
    }
  }

  function handleEditSub(sub: SubCategory) {
    setEditData({
      id: sub.id,
      name: sub.name,
      budgetLimit: sub.budgetLimit,
      isSystem: sub.isSystem,
    })
    setAddParentId(null)
    setAddParentName(null)
    setFormOpen(true)
  }

  async function handleDeleteSub(id: string, name: string) {
    if (!confirm(`"${name}" alt kategorisini silmek istediginize emin misiniz?`)) {
      return
    }

    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Kategori silindi", description: `${name} silindi.`, variant: "success" })
      invalidateClientFetchCache(["/api/categories", "/api/dashboard"])
      void fetchCategories({ force: true })
    } else {
      const data = await res.json()
      toast({ title: "Hata", description: data.error || "Kategori silinemedi.", variant: "destructive" })
    }
  }

  function handleAddSub(parentId: string) {
    const parent = categories.find((category) => category.id === parentId)
    setAddParentId(parentId)
    setAddParentName(parent?.name || null)
    setEditData(null)
    setFormOpen(true)
  }

  function handleEditMainBudget(cat: MainCategory) {
    setEditData({
      id: cat.id,
      name: cat.name,
      budgetLimit: cat.budgetLimit,
      isSystem: true,
    })
    setAddParentId(null)
    setAddParentName(null)
    setFormOpen(true)
  }

  const linkedCategoryNames = useMemo(() => {
    if (!dashboardSnapshot) {
      return []
    }

    const categoryNameById = new Map(
      categories.flatMap((category) => [
        [category.id, category.name],
        ...category.children.map((child) => [child.id, `${category.name} / ${child.name}`] as const),
      ])
    )

    const categoryCounts = new Map<string, number>()

    for (const rule of dashboardSnapshot.recurringRules) {
      if (!rule.categoryId) {
        continue
      }
      categoryCounts.set(rule.categoryId, (categoryCounts.get(rule.categoryId) || 0) + 1)
    }

    for (const payment of dashboardSnapshot.scheduledPayments) {
      if (!payment.categoryId) {
        continue
      }
      categoryCounts.set(payment.categoryId, (categoryCounts.get(payment.categoryId) || 0) + 1)
    }

    return Array.from(categoryCounts.entries())
      .sort((first, second) => second[1] - first[1])
      .slice(0, 4)
      .map(([categoryId, count]) => ({
        id: categoryId,
        name: categoryNameById.get(categoryId) ?? "Bilinmeyen kategori",
        count,
      }))
  }, [categories, dashboardSnapshot])

  const heroStats = [
    {
      label: "Ana kategori",
      value: String(categories.length),
      helper: "Sabit ana kategoriler altinda alt kategori organizasyonu kurulur.",
    },
    {
      label: "Alt kategori",
      value: String(categories.reduce((sum, category) => sum + category.children.length, 0)),
      helper: "Surukle birak ile ana kategoriler arasinda tasinabilir.",
    },
    {
      label: "Bagli abonelik",
      value: String(dashboardSnapshot?.subscriptions.totalActive ?? 0),
      helper: "Recurring kurallar kategori yapisiyla birlikte okunur.",
    },
    {
      label: "Planli odeme",
      value: String(dashboardSnapshot?.scheduledPayments.length ?? 0),
      helper: "Bu ay ve yakin donem planlama akisina baglanan odeme kayitlari.",
    },
  ]

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Kategori ve planlama merkezi"
        title="Kategoriler"
        description="Kategori agacinizi butce, abonelik ve planli odeme baglamiyla birlikte yonetin. Bu ekran artik sadece siniflandirma degil, ayni zamanda planlama merkezinizin temel yapisini tasiyor."
        actions={(
          <>
            <Button asChild variant="outline">
              <Link href="/budgets?focus=recurring-rules" prefetch>
                Planlama katmanina git
              </Link>
            </Button>
            <Button
              onClick={() => {
                setAddParentId(categories[0]?.id ?? null)
                setAddParentName(categories[0]?.name ?? null)
                setEditData(null)
                setFormOpen(true)
              }}
              disabled={categories.length === 0}
            >
              Alt kategori ekle
            </Button>
          </>
        )}
        stats={heroStats}
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[24px] ">
          <CardHeader className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Planlama ozeti</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Kategori yapisi su an recurring kurallar ve planli odemelerle ne kadar bagli, burada izlenir.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Kategoriye bagli recurring kural</p>
              <p className="mt-1 text-lg font-semibold">
                {dashboardSnapshot?.recurringRules.filter((rule) => rule.categoryId).length ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Kategoriye bagli scheduled payment</p>
              <p className="mt-1 text-lg font-semibold">
                {dashboardSnapshot?.scheduledPayments.filter((payment) => payment.categoryId).length ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">En baskin kategori</p>
              <p className="mt-1 text-lg font-semibold">
                {dashboardSnapshot?.insights.topCategory?.name ?? "Veri yok"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dashboardSnapshot?.insights.topCategory
                  ? formatCurrency(dashboardSnapshot.insights.topCategory.amount)
                  : "Harcama verisi bekleniyor."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] ">
          <CardHeader className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">One cikan bagli kategoriler</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              En cok recurring kural veya planli odeme bagina sahip kategoriler.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {linkedCategoryNames.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
                Henuz kategoriye bagli planlama kaydi yok.
              </div>
            ) : (
              linkedCategoryNames.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.count} planlama baglantisi
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/transactions?category=${item.id}&type=EXPENSE&month=${currentMonth}`} prefetch>
                      Hareketleri ac
                    </Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse rounded-[24px] ">
              <CardContent className="p-6">
                <div className="h-10 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card className="rounded-[24px] ">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Tags className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Henuz kategori yok</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Alt kategori yapisi olusturdukca butce, abonelik ve planli odeme analizi daha okunur hale gelir.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse rounded-[24px] ">
                  <CardContent className="p-6">
                    <div className="h-10 w-full rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          <CategoryTree
            categories={categories}
            onReorder={handleReorder}
            onEditSub={handleEditSub}
            onDeleteSub={handleDeleteSub}
            onAddSub={handleAddSub}
            onEditMainBudget={handleEditMainBudget}
          />
        </Suspense>
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
          setAddParentId(null)
          setAddParentName(null)
        }}
        onSuccess={() => {
          invalidateClientFetchCache(["/api/categories", "/api/dashboard"])
          void fetchCategories({ force: true })
        }}
        parentId={addParentId}
        parentName={addParentName}
        editData={editData}
      />
    </div>
  )
}
