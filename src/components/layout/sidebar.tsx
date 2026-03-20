"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Shield, ArrowLeftRight, LayoutDashboard, PiggyBank, Tags, Wallet, X } from "lucide-react"
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
    session?.user?.role === "ADMIN"
      ? [...baseNavigation, { name: "Admin", href: "/admin", icon: Shield }]
      : baseNavigation

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
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
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/70 bg-surface/95 backdrop-blur-xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-border/70 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-surface-foreground">Butce Yoneticisi</p>
            <p className="truncate text-xs text-muted-foreground">Personal finance cockpit</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto rounded-lg lg:hidden"
            onClick={onClose}
            type="button"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onClose}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/12 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground"
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
