"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

interface CategoryFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  parentId?: string | null
  parentName?: string | null
  editData?: {
    id: string
    name: string
    budgetLimit: number | null
    isSystem?: boolean
  } | null
}

export function CategoryForm({
  open,
  onClose,
  onSuccess,
  parentId,
  parentName,
  editData,
}: CategoryFormProps) {
  const [loading, setLoading] = useState(false)
  const isEdit = !!editData
  const isSystemEdit = editData?.isSystem

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const name = isSystemEdit ? editData.name : (formData.get("name") as string)
    const budgetLimitStr = formData.get("budgetLimit") as string
    const budgetLimit = budgetLimitStr ? parseFloat(budgetLimitStr) : null

    const url = isEdit ? `/api/categories/${editData.id}` : "/api/categories"
    const method = isEdit ? "PUT" : "POST"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, budgetLimit, parentId: isEdit ? undefined : parentId }),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      toast({
        title: "Hata",
        description: data.error || "Bir hata oluştu",
        variant: "destructive",
      })
      return
    }

    toast({
      title: isEdit ? "Kategori güncellendi" : "Alt kategori oluşturuldu",
      description: `${name} başarıyla ${isEdit ? "güncellendi" : "oluşturuldu"}.`,
      variant: "success",
    })

    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? isSystemEdit
                ? "Bütçe Limitini Düzenle"
                : "Kategori Düzenle"
              : "Yeni Alt Kategori"}
          </DialogTitle>
          {!isEdit && parentName && (
            <DialogDescription>
              &quot;{parentName}&quot; ana kategorisine yeni alt kategori ekle
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            {!isSystemEdit && (
              <div className="space-y-2">
                <Label htmlFor="name">Kategori Adı</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Örn: Elektrik"
                  defaultValue={editData?.name || ""}
                  required
                />
              </div>
            )}
            {isSystemEdit && (
              <div className="space-y-2">
                <Label>Kategori</Label>
                <p className="text-sm font-medium">{editData.name}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="budgetLimit">Aylık Bütçe Limiti (TL)</Label>
              <Input
                id="budgetLimit"
                name="budgetLimit"
                type="number"
                step="0.01"
                min="0"
                placeholder="Örn: 5000"
                defaultValue={editData?.budgetLimit ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Boş bırakırsanız bütçe limiti belirlenmez.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
