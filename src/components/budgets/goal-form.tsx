"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { fetchJsonWithCache } from "@/lib/client-fetch"
import type { Goal, MainCategory } from "@/types"

interface GoalFormProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editGoal?: Goal | null
}

export function GoalForm({ open, onClose, onSaved, editGoal }: GoalFormProps) {
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<MainCategory[]>([])

  const isEdit = !!editGoal

  const [scope, setScope] = useState<Goal["scope"]>(editGoal?.scope || "OVERALL")
  const [period, setPeriod] = useState<Goal["period"]>(editGoal?.period || "MONTHLY")
  const [direction, setDirection] = useState<Goal["direction"]>(editGoal?.direction || "SPEND_MAX")
  const [amount, setAmount] = useState(editGoal?.targetAmount?.toString() ?? "")
  const [categoryId, setCategoryId] = useState<string>(editGoal?.categoryId || "")

  useEffect(() => {
    if (open) {
      void fetchJsonWithCache<MainCategory[]>("/api/categories", { ttlMs: 30000 })
        .then(setCategories)
        .catch(() => setCategories([]))

      if (editGoal) {
        setScope(editGoal.scope)
        setPeriod(editGoal.period)
        setDirection(editGoal.direction)
        setAmount(editGoal.targetAmount.toString())
        setCategoryId(editGoal.categoryId || "")
      } else {
        setScope("OVERALL")
        setPeriod("MONTHLY")
        setDirection("SPEND_MAX")
        setAmount("")
        setCategoryId("")
      }
    }
  }, [open, editGoal])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const numericAmount = parseFloat(amount.replace(",", "."))
      if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
        toast({ title: "Hata", description: "Geçerli bir hedef tutarı giriniz.", variant: "destructive" })
        setLoading(false)
        return
      }

      const now = new Date()
      const payload = {
        scope,
        period,
        direction,
        targetAmount: numericAmount,
        year: now.getFullYear(),
        month: period === "MONTHLY" ? now.getMonth() + 1 : null,
        categoryId: scope === "CATEGORY" ? (categoryId || null) : null,
      }

      const url = isEdit ? `/api/goals/${editGoal.id}` : "/api/goals"
      const method = isEdit ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast({
          title: "Hata",
          description: err?.error || "Hedef kaydedilemedi.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      toast({
        title: isEdit ? "Hedef güncellendi" : "Hedef eklendi",
        variant: "success",
      })

      onSaved()
      onClose()
    } catch (err) {
      console.error("Goal save error:", err)
      toast({ title: "Hata", description: "Beklenmeyen bir hata oluştu.", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Hedefi Düzenle" : "Yeni Hedef"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kapsam</Label>
              <Select value={scope} onValueChange={(v: Goal["scope"]) => setScope(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OVERALL">Toplam Bakiye</SelectItem>
                  <SelectItem value="CATEGORY">Kategori Bazlı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Periyot</Label>
              <Select value={period} onValueChange={(v: Goal["period"]) => setPeriod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Aylık</SelectItem>
                  <SelectItem value="YEARLY">Yıllık</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {scope === "CATEGORY" && (
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((main) => (
                    <SelectItem key={main.id} value={main.id}>
                      {main.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Hedef Tipi</Label>
            <Select value={direction} onValueChange={(v: Goal["direction"]) => setDirection(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SPEND_MAX">Maksimum harcama</SelectItem>
                <SelectItem value="SAVE">Birikim (dönem sonu bakiye)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Hedef Tutar (TL)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
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

