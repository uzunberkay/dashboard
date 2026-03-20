"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"

interface AdminShellProps {
  currentAdmin: {
    name: string
    email: string
  }
  children: React.ReactNode
}

export function AdminShell({ currentAdmin, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_24%)]">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopbar
          name={currentAdmin.name}
          email={currentAdmin.email}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
