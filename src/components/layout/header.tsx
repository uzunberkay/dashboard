"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Bell, ChevronDown, LogOut, Menu, Search, Shield, User } from "lucide-react"
import { hasAdminAccess } from "@/lib/admin/permissions"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const pageNames: Record<string, string> = {
  "/": "Dashboard",
  "/transactions": "Islemler",
  "/categories": "Kategoriler",
  "/budgets": "Butce",
  "/admin": "Admin Panel",
}

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const currentPage = pageNames[pathname] || Object.entries(pageNames).find(([key]) => key !== "/" && pathname.startsWith(key))?.[1] || ""

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.08] bg-[var(--glass-bg-subtle)] px-4 backdrop-blur-xl dark:border-white/[0.05] sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl lg:hidden"
        onClick={onMenuClick}
        type="button"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Page title */}
      {currentPage && (
        <h2 className="hidden text-sm font-semibold text-foreground/80 lg:block">{currentPage}</h2>
      )}

      {/* Search */}
      <div className="mx-auto hidden w-full max-w-sm lg:block">
        <div className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-muted-foreground transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]">
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1">Ara...</span>
          <kbd className="pointer-events-none hidden rounded-md border border-white/[0.1] bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
        </div>
      </div>

      <div className="flex-1 lg:hidden" />

      {/* Notification bell */}
      <Button variant="ghost" size="icon" className="relative rounded-xl" type="button">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/40" />
      </Button>

      <ThemeToggle />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 rounded-xl px-2 sm:px-3" type="button">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/80 to-primary/60 text-xs font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline-block">
              {session?.user?.name}
            </span>
            <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 rounded-2xl border-white/[0.12] bg-popover/80 backdrop-blur-2xl dark:border-white/[0.06]"
        >
          <DropdownMenuLabel>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
            </div>
          </DropdownMenuLabel>
          {hasAdminAccess(session?.user?.role) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Panel
                </Link>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cikis Yap
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
