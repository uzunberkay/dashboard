"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Shield, ArrowLeftRight, LayoutDashboard, PiggyBank, Tags, Wallet, X } from "lucide-react"
import { hasAdminAccess } from "@/lib/admin/permissions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const baseNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Islemler", href: "/transactions", icon: ArrowLeftRight },
  { name: "Kategoriler", href: "/categories", icon: Tags },
  { name: "Butce", href: "/budgets", icon: PiggyBank },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const navigation =
    hasAdminAccess(session?.user?.role)
      ? [...baseNavigation, { name: "Admin", href: "/admin", icon: Shield }]
      : baseNavigation

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              onClose()
            }
          }}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.1] bg-[var(--glass-bg-strong)] backdrop-blur-[var(--glass-blur-lg)] transition-transform duration-300 ease-out dark:border-white/[0.06] lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Decorative gradient overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-r-2xl">
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-income/6 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex h-16 items-center gap-3 border-b border-white/[0.08] px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-foreground">Butce Yoneticisi</p>
            <p className="truncate text-[11px] text-muted-foreground">Personal finance cockpit</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto rounded-xl lg:hidden"
            onClick={onClose}
            type="button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/12 text-foreground shadow-sm backdrop-blur-sm"
                    : "text-muted-foreground hover:bg-white/[0.08] hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/25"
                      : "bg-white/[0.06] text-muted-foreground group-hover:bg-white/[0.12] group-hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* User profile card */}
        <div className="relative border-t border-white/[0.08] p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 backdrop-blur-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary/60 text-xs font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{session?.user?.name || "Kullanici"}</p>
              <p className="truncate text-[11px] text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
