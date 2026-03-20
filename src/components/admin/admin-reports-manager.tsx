"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { formatAdminScope } from "@/lib/admin/labels"
import { formatDateTime } from "@/lib/utils"
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
import type { AdminSavedViewScope, AdminSavedViewSummary } from "@/types/admin"

interface AdminReportsManagerProps {
  items: AdminSavedViewSummary[]
}

export function AdminReportsManager({ items }: AdminReportsManagerProps) {
  const router = useRouter()
  const [editingView, setEditingView] = useState<AdminSavedViewSummary | null>(null)
  const [name, setName] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const grouped = useMemo(() => {
    const groups: Record<AdminSavedViewScope, AdminSavedViewSummary[]> = {
      DASHBOARD: [],
      ACTIVITY: [],
      USERS: [],
    }

    for (const item of items) {
      groups[item.scope].push(item)
    }

    return groups
  }, [items])

  function startEdit(view: AdminSavedViewSummary) {
    setEditingView(view)
    setName(view.name)
    setIsDefault(view.isDefault)
  }

  async function handleSave() {
    if (!editingView) return
    setIsPending(true)

    try {
      const response = await fetch(`/api/admin/reports/${editingView.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          isDefault,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast({
          title: "Gorunum guncellenemedi",
          description: payload.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Gorunum guncellendi",
        description: "Kayitli preset bilgileri yenilendi.",
        variant: "success",
      })
      setEditingView(null)
      router.refresh()
    } catch {
      toast({
        title: "Baglanti hatasi",
        description: "Gorunum guncellenirken bir hata olustu.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  async function handleDelete(view: AdminSavedViewSummary) {
    const confirmed = window.confirm(`"${view.name}" gorunumu silinsin mi?`)
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/admin/reports/${view.id}`, {
        method: "DELETE",
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast({
          title: "Gorunum silinemedi",
          description: payload.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Gorunum silindi",
        description: "Kayitli preset listeden kaldirildi.",
        variant: "success",
      })
      router.refresh()
    } catch {
      toast({
        title: "Baglanti hatasi",
        description: "Silme islemi sirasinda bir hata olustu.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <div className="space-y-6">
        {(Object.keys(grouped) as AdminSavedViewScope[]).map((scope) => (
          <div key={scope} className="rounded-[26px] border border-border/70 bg-card/90 p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-sm font-semibold">{formatAdminScope(scope)}</p>
              <p className="text-sm text-muted-foreground">
                Bu scope icin kaydedilmis gorunumler, hizli linkler ve varsayilan presetler.
              </p>
            </div>

            {grouped[scope].length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Bu scope icin kayitli gorunum bulunmuyor.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {grouped[scope].map((view) => (
                  <div key={view.id} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{view.name}</p>
                          {view.isDefault ? <Badge variant="default">Varsayilan</Badge> : null}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {view.createdByName} | {formatDateTime(view.updatedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={view.href}>Uygula</Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(view)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(view)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(view.filters).length === 0 ? (
                        <Badge variant="secondary">Filtresiz varsayilan gorunum</Badge>
                      ) : (
                        Object.entries(view.filters).map(([key, value]) => (
                          <Badge key={`${view.id}-${key}`} variant="secondary">
                            {key}: {value}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={Boolean(editingView)} onOpenChange={(open) => !open && setEditingView(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kayitli gorunumu duzenle</DialogTitle>
            <DialogDescription>
              Presetin adini guncelleyebilir veya varsayilan olarak isaretleyebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
            <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(event) => setIsDefault(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              Bu scope icin varsayilan preset yap
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingView(null)}>
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
