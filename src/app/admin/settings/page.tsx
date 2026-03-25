import { Cpu, ShieldCheck, Users } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminSettingsForm } from "@/components/admin/admin-settings-form"
import { requireAdminPageSession } from "@/lib/admin/auth"
import { formatAdminRole } from "@/lib/admin/labels"
import { getAdminSettingsData } from "@/lib/admin/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminSettingsPage() {
  const { admin } = await requireAdminPageSession("settings:view")
  const data = await getAdminSettingsData({
    name: admin.name,
    email: admin.email,
    role: admin.role,
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin ayarlari"
        title="Guvenli operasyon policy merkezi"
        description="Dusuk riskli admin ayarlarini panelden duzenleyin; cache, export ve denetim esiklerini tek yerden yonetin."
      />

      <AdminSettingsForm definitions={data.definitions} values={data.values} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Guvenlik temeli</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Oturum stratejisi</p>
              <p className="mt-1 font-medium">{data.security.sessionStrategy}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Rol korumasi</p>
              <p className="mt-1 font-medium">{data.security.roleGuard}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Giris hiz siniri</p>
              <p className="mt-1 font-medium">{data.security.loginRateLimit}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Cpu className="h-5 w-5 text-emerald-500" />
              <CardTitle>Calisan policy degerleri</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard varsayilan aralik</p>
              <p className="mt-1 font-medium">{data.values.dashboardDefaultRange}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard cache TTL</p>
              <p className="mt-1 font-medium">{data.values.dashboardCacheTtlSec}s</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">System cache TTL</p>
              <p className="mt-1 font-medium">{data.values.systemCacheTtlSec}s</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-amber-500" />
              <CardTitle>Yonetsim</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mevcut admin</p>
              <p className="mt-1 font-medium">{data.currentAdmin.name}</p>
              <p className="text-muted-foreground">{data.currentAdmin.email}</p>
              <p className="text-muted-foreground">{formatAdminRole(data.currentAdmin.role)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Staff sayisi</p>
              <p className="mt-1 font-medium">{data.governance.staffCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Super admin</p>
              <p className="mt-1 font-medium">{data.governance.superAdminCount}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pasif kullanicilar</p>
              <p className="mt-1 font-medium">{data.governance.inactiveUsers}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bekleyen onaylar</p>
              <p className="mt-1 font-medium">{data.governance.pendingApprovals}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Kayitli gorunumler</p>
              <p className="mt-1 font-medium">{data.governance.savedViews}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
