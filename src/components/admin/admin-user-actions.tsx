"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Download, Loader2, ShieldAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatAdminRole } from "@/lib/admin/labels"
import { getManageableRolesForActor } from "@/lib/admin/permissions"
import type { AdminStaffRole, AdminUserRole } from "@/types/admin"

interface AdminUserActionsProps {
  userId: string
  role: AdminUserRole
  isActive: boolean
  isSelf: boolean
  viewerRole: AdminStaffRole
  canRequestUserOps: boolean
  canManageStaffRoles: boolean
  canRevokeSessions: boolean
  canRequestRawExport: boolean
}

type MutationResult = {
  ok?: boolean
  mode?: "approval_requested" | "completed"
  message?: string
  error?: string
}

export function AdminUserActions({
  userId,
  role,
  isActive,
  isSelf,
  viewerRole,
  canRequestUserOps,
  canManageStaffRoles,
  canRevokeSessions,
  canRequestRawExport,
}: AdminUserActionsProps) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<AdminUserRole>(role)
  const [nextIsActive, setNextIsActive] = useState(isActive)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const manageableRoles = useMemo(() => getManageableRolesForActor(viewerRole), [viewerRole])
  const targetIsStaff = role !== "USER"
  const canManageThisAccount = canRequestUserOps && (!targetIsStaff || canManageStaffRoles)
  const canChangeRole = canManageStaffRoles && manageableRoles.length > 1
  const hasPendingAccountChange =
    (canChangeRole && selectedRole !== role) || nextIsActive !== isActive
  const hasActionAccess = canManageThisAccount || canRevokeSessions || canRequestRawExport

  function requireReason() {
    if (reason.trim().length >= 3) {
      return reason.trim()
    }

    toast({
      title: "Onay notu gerekli",
      description: "Lutfen en az 3 karakterlik bir operasyon notu girin.",
      variant: "warning",
    })
    return null
  }

  function submitAccountUpdate() {
    if (!canManageThisAccount || !hasPendingAccountChange) {
      return
    }

    if (isSelf) {
      toast({
        title: "Kendi hesabiniz korunuyor",
        description: "Kendi hesap durumunuz icin onay istegi acamazsiniz.",
        variant: "warning",
      })
      return
    }

    const approvalReason = requireReason()
    if (!approvalReason) {
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(canChangeRole && selectedRole !== role ? { role: selectedRole } : {}),
          ...(nextIsActive !== isActive ? { isActive: nextIsActive } : {}),
          reason: approvalReason,
        }),
      })

      const result = (await response.json()) as MutationResult
      if (!response.ok) {
        toast({
          title: "Islem basarisiz",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: result.mode === "approval_requested" ? "Onay istegi olusturuldu" : "Islem tamamlandi",
        description: result.message ?? "Hesap degisikligi kaydedildi.",
        variant: "success",
      })

      router.refresh()
    })
  }

  function revokeSessions() {
    if (!canRevokeSessions || isSelf || (targetIsStaff && !canManageStaffRoles)) {
      return
    }

    const confirmed = window.confirm("Bu kullanicinin aktif oturumlari hemen gecersiz kilinsin mi?")
    if (!confirmed) {
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}/sessions`, {
        method: "POST",
      })

      const result = (await response.json()) as MutationResult
      if (!response.ok) {
        toast({
          title: "Oturumlar kapatilamadi",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Oturumlar gecersiz kilindi",
        description: result.message ?? "Mevcut token'lar kapatildi.",
        variant: "success",
      })

      router.refresh()
    })
  }

  function requestRawExport() {
    if (!canRequestRawExport) {
      return
    }

    const approvalReason = requireReason()
    if (!approvalReason) {
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: approvalReason,
        }),
      })

      const result = (await response.json()) as MutationResult
      if (!response.ok) {
        toast({
          title: "Ham export istegi olusturulamadi",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Ham export istegi olusturuldu",
        description: result.message ?? "Istek approval kuyruguna eklendi.",
        variant: "success",
      })

      router.refresh()
    })
  }

  if (!hasActionAccess) {
    return null
  }

  return (
    <div className="rounded-[24px] border border-white/[0.12] bg-card/70 backdrop-blur-xl dark:border-white/[0.06] p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Admin islemleri</p>
          <p className="text-sm text-muted-foreground">
            Hesap aksiyonlari dogrudan uygulanmaz; gerekli olanlar onay kuyruguna alinip ikinci yetkili tarafindan tamamlanir.
          </p>
        </div>

        {canManageThisAccount ? (
          <div className="grid gap-4 rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="admin-user-status"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Hesap durumu
                </label>
                <select
                  id="admin-user-status"
                  value={nextIsActive ? "active" : "inactive"}
                  onChange={(event) => setNextIsActive(event.target.value === "active")}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>

              {canChangeRole ? (
                <div className="space-y-2">
                  <label
                    htmlFor="admin-user-role"
                    className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                  >
                    Rol
                  </label>
                  <select
                    id="admin-user-role"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value as AdminUserRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {manageableRoles.map((item) => (
                      <option key={item} value={item}>
                        {formatAdminRole(item)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="admin-user-reason"
                className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Operasyon notu
              </label>
              <Textarea
                id="admin-user-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Degisikligin gerekcesi, beklenen etki ve gerekiyorsa risk notu"
                className="min-h-[112px]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button disabled={isPending || !hasPendingAccountChange} onClick={submitAccountUpdate}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Degisikligi onaya gonder
              </Button>
              <Badge variant="secondary">Mevcut rol: {formatAdminRole(role)}</Badge>
              <Badge variant={isActive ? "success" : "warning"}>{isActive ? "Aktif" : "Pasif"}</Badge>
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4 text-sm text-muted-foreground">
            Bu hesap tipi icin rol veya durum degisikligi isteme yetkiniz bulunmuyor.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canRevokeSessions ? (
            <Button
              variant="outline"
              disabled={isPending || isSelf || (targetIsStaff && !canManageStaffRoles)}
              onClick={revokeSessions}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tum oturumlari kapat
            </Button>
          ) : null}

          {canRequestRawExport ? (
            <Button variant="outline" disabled={isPending} onClick={requestRawExport}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Ham export iste
            </Button>
          ) : null}
        </div>

        {isSelf ? (
          <div className="flex items-start gap-3 rounded-[22px] border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Kendi hesabiniz icin durum degisikligi veya oturum kapatma aksiyonu acamazsiniz.
          </div>
        ) : null}
      </div>
    </div>
  )
}
