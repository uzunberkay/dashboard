import { CheckCheck } from "lucide-react"
import { AdminApprovalQueue } from "@/components/admin/admin-approval-queue"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { requireAdminPageSession } from "@/lib/admin/auth"
import { getAdminApprovalQueueData } from "@/lib/admin/approvals-data"

export default async function AdminApprovalsPage() {
  const { admin } = await requireAdminPageSession("approvals:view")
  const data = await getAdminApprovalQueueData({
    id: admin.id,
    role: admin.role,
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Onay kuyrugu"
        title="Kritik admin istekleri"
        description="Rol degisimi, hassas hesap operasyonlari, ayar degisiklikleri ve ham export istekleri iki kisilik approval akisi ile burada sonuclanir."
        actions={<CheckCheck className="h-5 w-5 text-primary" />}
      />

      <AdminApprovalQueue data={data} />
    </div>
  )
}
