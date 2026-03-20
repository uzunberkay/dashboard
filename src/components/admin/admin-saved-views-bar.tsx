"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { BookmarkPlus } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { buildQueryString, cleanFilterRecord } from "@/lib/admin/query"
import { formatAdminScope } from "@/lib/admin/labels"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { AdminSavedViewScope, AdminSavedViewSummary } from "@/types/admin"

interface AdminSavedViewsBarProps {
  scope: AdminSavedViewScope
  views: AdminSavedViewSummary[]
  currentFilters: Record<string, string | undefined>
}

export function AdminSavedViewsBar({
  scope,
  views,
  currentFilters,
}: AdminSavedViewsBarProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const cleanedFilters = useMemo(() => cleanFilterRecord(currentFilters), [currentFilters])
  const currentSignature = useMemo(() => buildQueryString(cleanedFilters), [cleanedFilters])

  async function handleSave() {
    if (!name.trim()) {
      toast({
        title: "Gorunum adi gerekli",
        description: "Kayitli gorunum icin anlamli bir ad girin.",
        variant: "warning",
      })
      return
    }

    setIsPending(true)

    try {
      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope,
          name: name.trim(),
          filters: cleanedFilters,
          isDefault,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast({
          title: "Gorunum kaydedilemedi",
          description: payload.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Gorunum kaydedildi",
        description: `${formatAdminScope(scope)} icin yeni filtre gorunumu hazir.`,
        variant: "success",
      })

      setOpen(false)
      setName("")
      setIsDefault(false)
      router.refresh()
    } catch {
      toast({
        title: "Baglanti hatasi",
        description: "Kayitli gorunum olusturulurken bir hata olustu.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <>
      <div className="rounded-[24px] border border-border/70 bg-card/85 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">Kayitli gorunumler</p>
            <p className="text-sm text-muted-foreground">
              Bu sayfanin filtre setini tekrar kullanmak icin kaydedebilir ve varsayilan yapabilirsiniz.
            </p>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={() => setOpen(true)}>
            <BookmarkPlus className="h-4 w-4" />
            Mevcut gorunumu kaydet
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {views.length === 0 ? (
            <Badge variant="secondary">Henuz kayitli gorunum yok</Badge>
          ) : (
            views.map((view) => {
              const isActive = buildQueryString(view.filters) === currentSignature

              return (
                <Button
                  key={view.id}
                  asChild
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                >
                  <Link href={view.href}>
                    {view.name}
                    {view.isDefault ? " | Varsayilan" : ""}
                  </Link>
                </Button>
              )
            })
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtre gorunumunu kaydet</DialogTitle>
            <DialogDescription>
              {formatAdminScope(scope)} ekranindaki mevcut URL filtreleri kayitli bir gorunume donusecek.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="saved-view-name">Gorunum adi</Label>
              <Input
                id="saved-view-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ornek: Son 30 gun aktif kullanicilar"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Bu scope icin varsayilan gorunum yap
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Vazgec
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
