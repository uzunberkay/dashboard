"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { fetchJsonWithCache } from "@/lib/client-fetch"
import type { TransactionType, MainCategory } from "@/types"

interface TransactionFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  editData?: {
    id: string
    type: TransactionType
    amount: number
    description: string | null
    date: string
    categoryId: string | null
  } | null
}

export function TransactionForm({ open, onClose, onSuccess, editData }: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<MainCategory[]>([])
  const [type, setType] = useState<TransactionType>(editData?.type || "EXPENSE")
  const [categoryId, setCategoryId] = useState<string>(editData?.categoryId || "")
  const isEdit = !!editData

  useEffect(() => {
    if (open) {
      void fetchJsonWithCache<MainCategory[]>("/api/categories", { ttlMs: 30000 })
        .then(setCategories)
      if (editData) {
        setType(editData.type)
        setCategoryId(editData.categoryId || "")
      } else {
        setType("EXPENSE")
        setCategoryId("")
      }
    }
  }, [open, editData])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const rawAmount = formData.get("amount") as string
      const amount = parseFloat(rawAmount.replace(",", "."))
      const description = formData.get("description") as string
      const date = formData.get("date") as string

      if (!amount || isNaN(amount) || amount <= 0) {
        toast({ title: "Hata", description: "Geçerli bir tutar giriniz.", variant: "destructive" })
        setLoading(false)
        return
      }

      const payload = {
        type,
        amount,
        description: description || undefined,
        date,
        categoryId: type === "EXPENSE" ? (categoryId || null) : null,
      }

      const url = isEdit ? `/api/transactions/${editData.id}` : "/api/transactions"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        toast({
          title: "Hata",
          description: errData?.error || "İşlem kaydedilemedi.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const data = await res.json()

      if (data.budgetAlert) {
        toast({
          title: data.budgetAlert.type === "danger" ? "Bütçe Aşımı!" : "Bütçe Uyarısı",
          description: data.budgetAlert.message,
          variant: data.budgetAlert.type === "danger" ? "destructive" : "warning",
        })
      }

      toast({
        title: isEdit ? "İşlem güncellendi" : "İşlem eklendi",
        description: `${type === "INCOME" ? "Gelir" : "Harcama"} başarıyla ${isEdit ? "güncellendi" : "kaydedildi"}.`,
        variant: "success",
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error("Form submit error:", err)
      toast({ title: "Hata", description: "Beklenmeyen bir hata oluştu.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "İşlem Düzenle" : "Yeni İşlem"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>İşlem Türü</Label>
              <div className="flex gap-1 rounded-xl border border-white/[0.1] bg-white/[0.04] p-1 backdrop-blur-sm">
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    type === "EXPENSE"
                      ? "bg-expense/15 text-expense shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setType("EXPENSE")}
                >
                  Harcama
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    type === "INCOME"
                      ? "bg-income/15 text-income shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setType("INCOME")}
                >
                  Gelir
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Tutar (TL)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                defaultValue={editData?.amount || ""}
                required
              />
            </div>

            {type === "EXPENSE" && (
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((mainCat) => (
                      <SelectGroup key={mainCat.id}>
                        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {mainCat.name}
                        </p>
                        {mainCat.children && mainCat.children.length > 0 ? (
                          mainCat.children.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value={mainCat.id}>
                            {mainCat.name}
                          </SelectItem>
                        )}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={editData?.date ? editData.date.split("T")[0] : today}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input
                id="description"
                name="description"
                placeholder="İsteğe bağlı açıklama"
                defaultValue={editData?.description || ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
