"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { formatAdminRole } from "@/lib/admin/labels"

interface AdminUserActionsProps {
  userId: string
  role: "USER" | "ADMIN"
  isActive: boolean
  isSelf: boolean
}

export function AdminUserActions({ userId, role, isActive, isSelf }: AdminUserActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function mutate(payload: { role?: "USER" | "ADMIN"; isActive?: boolean }) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast({
          title: "Islem basarisiz",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Kullanici guncellendi",
        description: "Hesap durumu yenilendi.",
        variant: "success",
      })

      router.refresh()
    })
  }

  return (
    <div className="rounded-[24px] border border-border/70 bg-card/85 p-5">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold">Admin islemleri</p>
          <p className="text-sm text-muted-foreground">
            Detay sayfasindan ayrilmadan bu hesap uzerinde yonetsel islemler yapin.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={isActive ? "outline" : "default"}
            disabled={isPending || (isSelf && isActive)}
            onClick={() => mutate({ isActive: !isActive })}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isActive ? "Hesabi pasif yap" : "Hesabi aktif yap"}
          </Button>
          <Button
            variant="outline"
            disabled={isPending || (isSelf && role === "ADMIN")}
            onClick={() => mutate({ role: role === "ADMIN" ? "USER" : "ADMIN" })}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {role === "ADMIN" ? `${formatAdminRole("USER")} yap` : `${formatAdminRole("ADMIN")} yap`}
          </Button>
        </div>

        {isSelf ? (
          <p className="text-xs text-muted-foreground">
            Admin surekliligini korumak icin kendi hesabinizi pasiflestirme ve rol dusurme engellenmistir.
          </p>
        ) : null}
      </div>
    </div>
  )
}
