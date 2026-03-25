"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  CheckCheck,
  Files,
  LayoutDashboard,
  PanelLeftClose,
  ServerCog,
  Settings,
  Shield,
  Users,
  WalletCards,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { hasPermission } from "@/lib/admin/permissions"
import { cn } from "@/lib/utils"
import type { AdminPermission, AdminStaffRole } from "@/types/admin"

const navigation = [
  { name: "Genel bakis", href: "/admin", icon: LayoutDashboard, permission: "dashboard:view" },
  { name: "Kullanicilar", href: "/admin/users", icon: Users, permission: "users:view" },
  { name: "Aktivite", href: "/admin/activity", icon: Activity, permission: "activity:view" },
  { name: "Raporlar", href: "/admin/reports", icon: Files, permission: "reports:view" },
  { name: "Onay kuyrugu", href: "/admin/approvals", icon: CheckCheck, permission: "approvals:view" },
  { name: "Sistem", href: "/admin/system", icon: ServerCog, permission: "system:view" },
  { name: "Ayarlar", href: "/admin/settings", icon: Settings, permission: "settings:view" },
] satisfies Array<{
  name: string
  href: string
  icon: typeof LayoutDashboard
  permission: AdminPermission
}>

interface AdminSidebarProps {
  role: AdminStaffRole
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ role, open, onClose }: AdminSidebarProps) {
  const pathname = usePathname()
  const visibleNavigation = navigation.filter((item) => hasPermission(role, item.permission))

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Admin gezinmesini kapat"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-white/[0.1] bg-[var(--glass-bg-strong)] text-foreground shadow-[var(--glass-shadow-lg)] backdrop-blur-[var(--glass-blur-lg)] transition-transform duration-300 ease-out dark:border-white/[0.06] lg:static lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-20 items-center gap-4 border-b border-current/10 px-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-slate-100 dark:text-slate-950">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Admin paneli
            </p>
            <p className="truncate text-lg font-semibold">Tuna Yonetim Merkezi</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto rounded-xl lg:hidden"
            onClick={onClose}
            type="button"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-5 pt-5">
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.06] p-4 backdrop-blur-sm dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <WalletCards className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Platform operasyonlari</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Izleme, kullanicilar ve yonetisim</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-5">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-slate-100 dark:text-slate-950"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900/80 dark:hover:text-slate-50"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                    isActive
                      ? "bg-white/15 text-white dark:bg-slate-950/10 dark:text-slate-950"
                      : "bg-slate-100 text-slate-500 group-hover:bg-slate-950/5 group-hover:text-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-slate-700 dark:group-hover:text-slate-100"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.name}
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
