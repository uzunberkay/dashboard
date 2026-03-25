import Link from "next/link"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminReportsManager } from "@/components/admin/admin-reports-manager"
import { Button } from "@/components/ui/button"
import { requireAdminPageSession } from "@/lib/admin/auth"
import { hasPermission } from "@/lib/admin/permissions"
import { getAdminReportsData } from "@/lib/admin/data"

export default async function AdminReportsPage() {
  const { admin } = await requireAdminPageSession("reports:view")
  const data = await getAdminReportsData(admin.role)

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Raporlar"
        title="Kayitli admin gorunumleri"
        description="Dashboard, kullanici listesi ve aktivite explorer icin kaydedilmis presetleri tek yerden yonetin."
        actions={
          hasPermission(admin.role, "reports:export:aggregate") ? (
            <Button variant="outline" asChild>
              <Link href="/api/admin/reports/export">Aggregate export</Link>
            </Button>
          ) : null
        }
      />

      <AdminReportsManager items={data.items} />
    </div>
  )
}
