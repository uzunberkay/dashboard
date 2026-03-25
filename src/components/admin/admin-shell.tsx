"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminTopbar } from "@/components/admin/admin-topbar"
import type { AdminStaffRole } from "@/types/admin"

interface AdminShellProps {
  currentAdmin: {
    name: string
    email: string
    role: AdminStaffRole
  }
  children: React.ReactNode
}

export function AdminShell({ currentAdmin, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Background gradient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-primary/[0.06] blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-[500px] w-[500px] rounded-full bg-income/[0.04] blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-warning/[0.03] blur-[100px]" />
      </div>
      <AdminSidebar role={currentAdmin.role} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative z-10 flex min-h-screen min-w-0 flex-1 flex-col">
        <AdminTopbar
          name={currentAdmin.name}
          email={currentAdmin.email}
          role={currentAdmin.role}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
