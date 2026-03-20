import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminReportsManager } from "@/components/admin/admin-reports-manager"
import { getAdminReportsData } from "@/lib/admin/data"

export default async function AdminReportsPage() {
  const data = await getAdminReportsData()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Raporlar"
        title="Kayitli admin gorunumleri"
        description="Dashboard, kullanici listesi ve aktivite explorer icin kaydedilmis presetleri tek yerden yonetin."
      />

      <AdminReportsManager items={data.items} />
    </div>
  )
}
