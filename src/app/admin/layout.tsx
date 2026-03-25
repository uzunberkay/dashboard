import { AdminShell } from "@/components/admin/admin-shell"
import { requireAdminPageSession } from "@/lib/admin/auth"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { admin } = await requireAdminPageSession()

  return (
    <AdminShell
      currentAdmin={{
        name: admin.name,
        email: admin.email,
        role: admin.role,
      }}
    >
      {children}
    </AdminShell>
  )
}
