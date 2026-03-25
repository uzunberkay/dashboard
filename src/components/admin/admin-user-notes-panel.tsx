"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/utils"
import type { AdminUserNoteItem } from "@/types/admin"

interface AdminUserNotesPanelProps {
  userId: string
  notes: AdminUserNoteItem[]
  canCreate: boolean
}

export function AdminUserNotesPanel({ userId, notes, canCreate }: AdminUserNotesPanelProps) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleCreateNote() {
    if (!canCreate) {
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast({
          title: "Not eklenemedi",
          description: payload.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      setBody("")
      toast({
        title: "Not eklendi",
        description: "Internal timeline guncellendi.",
        variant: "success",
      })
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Internal notlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canCreate ? (
          <div className="space-y-3 rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Destek veya operasyon baglamini kisaca kaydedin"
              className="min-h-[112px]"
            />
            <div className="flex justify-end">
              <Button onClick={handleCreateNote} disabled={isPending || body.trim().length < 3}>
                {isPending ? "Kaydediliyor..." : "Not ekle"}
              </Button>
            </div>
          </div>
        ) : null}

        {notes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-muted-foreground">
            Henuz internal not bulunmuyor.
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{note.authorName}</p>
                  <p className="text-xs text-muted-foreground">{note.authorEmail ?? "Sistem"}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{note.body}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
