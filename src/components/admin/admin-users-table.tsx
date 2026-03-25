"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, Loader2, Shield, UserCog } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatAdminRole } from "@/lib/admin/labels"
import { formatDateTime, formatRelativeTime } from "@/lib/utils"
import type { AdminUserListItem } from "@/types/admin"

interface AdminUsersTableProps {
  users: AdminUserListItem[]
  canBulkUpdate: boolean
}

type BulkMutationResponse = {
  ok?: boolean
  mode?: "approval_requested" | "completed"
  message?: string
  error?: string
}

export function AdminUsersTable({ users, canBulkUpdate }: AdminUsersTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [previewUser, setPreviewUser] = useState<AdminUserListItem | null>(null)
  const [isPending, startTransition] = useTransition()

  const allSelected = useMemo(
    () => users.length > 0 && users.every((user) => selectedIds.includes(user.id)),
    [selectedIds, users]
  )

  function toggleSelection(userId: string) {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((value) => value !== userId) : [...current, userId]
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : users.map((user) => user.id))
  }

  function runBulkAction(action: "enable" | "disable") {
    if (!canBulkUpdate) {
      return
    }

    if (selectedIds.length === 0) {
      toast({
        title: "Kullanici secilmedi",
        description: "Toplu islem oncesinde en az bir kullanici secin.",
        variant: "warning",
      })
      return
    }

    const reason = window.prompt("Bu toplu islem icin kisa bir onay notu girin.")
    if (reason === null) {
      return
    }

    if (reason.trim().length < 3) {
      toast({
        title: "Onay notu gerekli",
        description: "Lutfen en az 3 karakterlik bir gerekce girin.",
        variant: "warning",
      })
      return
    }

    startTransition(async () => {
      const response = await fetch("/api/admin/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: selectedIds,
          action,
          reason: reason.trim(),
        }),
      })

      const payload = (await response.json()) as BulkMutationResponse
      if (!response.ok) {
        toast({
          title: "Toplu islem basarisiz",
          description: payload.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: payload.mode === "approval_requested" ? "Onay istegi olusturuldu" : "Toplu islem tamamlandi",
        description: payload.message ?? "Toplu islem sonuclandi.",
        variant: "success",
      })

      setSelectedIds([])
      router.refresh()
    })
  }

  if (users.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-white/[0.08] bg-card/70 px-6 py-12 text-center">
        <p className="text-lg font-semibold">Kullanici bulunamadi</p>
        <p className="mt-2 text-sm text-muted-foreground">E-posta, rol veya durum filtrelerini genisletmeyi deneyin.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4 rounded-[26px] border border-white/[0.12] bg-card/70 backdrop-blur-xl dark:border-white/[0.06] p-4 shadow-sm">
        {canBulkUpdate ? (
          <div className="flex flex-col gap-3 rounded-[22px] border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold">Toplu islemler</p>
              <p className="text-sm text-muted-foreground">Bu sayfada {selectedIds.length} kullanici secili</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => runBulkAction("enable")}>
                Aktif et
              </Button>
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => runBulkAction("disable")}>
                Pasif yap
              </Button>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/[0.06] bg-white/[0.04] backdrop-blur-sm p-4 text-sm text-muted-foreground">
            Bu rolde toplu kullanici mutasyonu kapali. Listeleme, detay ve audit kisayollari acik kalir.
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              {canBulkUpdate ? (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Tum kullanicilari sec"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </TableHead>
              ) : null}
              <TableHead>E-posta</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Olusturma</TableHead>
              <TableHead>Son giris</TableHead>
              <TableHead className="text-right">Islemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                {canBulkUpdate ? (
                  <TableCell className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleSelection(user.id)}
                      aria-label={`${user.email} kullanicisini sec`}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </TableCell>
                ) : null}
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{user.transactionCount} islem</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "USER" ? "secondary" : "default"}>
                    {formatAdminRole(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "warning"}>
                    {user.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : "Hic"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPreviewUser(user)}>
                      <Eye className="h-4 w-4" />
                      Hizli bakis
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}`}>
                        <UserCog className="h-4 w-4" />
                        Ac
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/activity?target=${encodeURIComponent(user.email)}`}>Audit</Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(previewUser)} onOpenChange={(open) => !open && setPreviewUser(null)}>
        <SheetContent>
          {previewUser ? (
            <>
              <SheetHeader>
                <SheetTitle>{previewUser.email}</SheetTitle>
                <SheetDescription>Secilen hesap icin hizli operasyon ozeti.</SheetDescription>
              </SheetHeader>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {previewUser.role === "USER" ? <UserCog className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{previewUser.name}</p>
                      <p className="text-sm text-muted-foreground">{previewUser.email}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rol</p>
                    <p className="mt-2 text-lg font-semibold">{formatAdminRole(previewUser.role)}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Durum</p>
                    <p className="mt-2 text-lg font-semibold">{previewUser.isActive ? "Aktif" : "Pasif"}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Olusturma</p>
                    <p className="mt-2 text-sm font-medium">{formatDateTime(previewUser.createdAt)}</p>
                  </div>
                  <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Son giris</p>
                    <p className="mt-2 text-sm font-medium">
                      {previewUser.lastLoginAt ? formatDateTime(previewUser.lastLoginAt) : "Henuz giris yok"}
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Aktivite yogunlugu</p>
                  <p className="mt-2 text-2xl font-semibold">{previewUser.transactionCount}</p>
                  <p className="text-sm text-muted-foreground">Bu hesaba bagli mevcut islem sayisi.</p>
                </div>

                <Button asChild className="rounded-xl">
                  <Link href={`/admin/users/${previewUser.id}`}>Tam kullanici detayini ac</Link>
                </Button>

                <Button asChild variant="outline" className="rounded-xl">
                  <Link href={`/admin/activity?target=${encodeURIComponent(previewUser.email)}`}>
                    Audit akisini ac
                  </Link>
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
