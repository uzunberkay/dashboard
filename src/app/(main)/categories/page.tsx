"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { CategoryTree } from "@/components/categories/category-tree"
import { CategoryForm } from "@/components/categories/category-form"
import { toast } from "@/hooks/use-toast"
import { Tags } from "lucide-react"
import type { MainCategory, SubCategory } from "@/types"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<MainCategory[]>([])
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

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories")
    if (res.ok) {
      const data = await res.json()
      setCategories(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCategories()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchCategories])

  async function handleReorder(categoryId: string, newParentId: string, newSortOrder: number) {
    const res = await fetch("/api/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, newParentId, newSortOrder }),
    })

    if (res.ok) {
      fetchCategories()
    } else {
      toast({ title: "Hata", description: "Sıralama güncellenemedi.", variant: "destructive" })
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
    if (!confirm(`"${name}" alt kategorisini silmek istediğinize emin misiniz?`)) return

    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast({ title: "Kategori silindi", description: `${name} silindi.`, variant: "success" })
      fetchCategories()
    } else {
      const data = await res.json()
      toast({ title: "Hata", description: data.error || "Kategori silinemedi.", variant: "destructive" })
    }
  }

  function handleAddSub(parentId: string) {
    const parent = categories.find((c) => c.id === parentId)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kategoriler</h1>
        <p className="text-muted-foreground">
          Alt kategorileri sürükleyip bırakarak ana kategoriler arasında taşıyabilirsiniz
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-10 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tags className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Henüz kategori yok</h3>
          </CardContent>
        </Card>
      ) : (
        <CategoryTree
          categories={categories}
          onReorder={handleReorder}
          onEditSub={handleEditSub}
          onDeleteSub={handleDeleteSub}
          onAddSub={handleAddSub}
          onEditMainBudget={handleEditMainBudget}
        />
      )}

      <CategoryForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditData(null)
          setAddParentId(null)
          setAddParentName(null)
        }}
        onSuccess={fetchCategories}
        parentId={addParentId}
        parentName={addParentName}
        editData={editData}
      />
    </div>
  )
}
