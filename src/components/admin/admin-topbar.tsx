"use client"

import { signOut } from "next-auth/react"
import { LogOut, Menu } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatAdminRole } from "@/lib/admin/labels"
import type { AdminStaffRole } from "@/types/admin"

interface AdminTopbarProps {
  name: string
  email: string
  role: AdminStaffRole
  onMenuClick: () => void
}

export function AdminTopbar({ name, email, role, onMenuClick }: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl lg:hidden"
        onClick={onMenuClick}
        type="button"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Kurumsal admin</p>
        <p className="truncate text-sm text-foreground/80">{email}</p>
      </div>

      <Badge variant="secondary" className="hidden rounded-full px-3 py-1 sm:inline-flex">
        {formatAdminRole(role)}
      </Badge>

      <ThemeToggle className="rounded-xl" />

      <div className="hidden rounded-2xl border border-border/70 bg-card/80 px-4 py-2 text-right sm:block">
        <p className="text-sm font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{formatAdminRole(role)}</p>
      </div>

      <Button variant="outline" className="rounded-xl" onClick={() => signOut({ callbackUrl: "/login" })}>
        <LogOut className="h-4 w-4" />
        Cikis yap
      </Button>
    </header>
  )
}
