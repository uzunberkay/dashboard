import { Activity, AlertTriangle, DatabaseZap, ServerCog } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminSystemData } from "@/lib/admin/data"
import { formatDateTime } from "@/lib/utils"

export default async function AdminSystemPage() {
  const data = await getAdminSystemData()
  const environmentLabel =
    {
      production: "uretim",
      development: "gelistirme",
      test: "test",
    }[data.environment] ?? data.environment

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Sistem izleme"
        title="Calisma zamani, hata ve policy sagligi"
        description="Canli API sagligi, DB gecikmesi ve policy esiklerinin uygulamadaki etkisini yonetim alanindan cikmadan izleyin."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">API sagligi</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <Badge variant={data.apiStatus === "healthy" ? "success" : "warning"}>
                {data.apiStatus === "healthy" ? "Saglikli" : "Uyari"}
              </Badge>
              <p className="mt-3 text-sm text-muted-foreground">Son hatalar ve policy esiklerine gore yorumlanir.</p>
            </div>
            <ServerCog className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Veritabani</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <Badge variant={data.databaseStatus === "healthy" ? "success" : "warning"}>
                {data.databaseStatus === "healthy" ? "Saglikli" : "Uyari"}
              </Badge>
              <p className="mt-3 text-sm text-muted-foreground">
                Bozulma esigi: {data.policies.dbDegradedThresholdMs}ms
              </p>
            </div>
            <DatabaseZap className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">DB yanit suresi</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{data.dbResponseTimeMs}ms</p>
              <p className="text-sm text-muted-foreground">Son sunucu tarafli kontrol sonucu.</p>
            </div>
            <Activity className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Yakalanan hatalar</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{data.recentErrors.length}</p>
              <p className="text-sm text-muted-foreground">Bellekte tutulan son hata goruntuleri.</p>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="space-y-2">
            <CardTitle>Policy ozetleri</CardTitle>
            <p className="text-sm text-muted-foreground">Ortam: {environmentLabel}</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Aktivite retention</p>
              <p className="mt-2 text-lg font-semibold">{data.policies.activityRetentionDays} gun</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Export limiti</p>
              <p className="mt-2 text-lg font-semibold">{data.policies.exportMaxRows} satir</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Dashboard cache</p>
              <p className="mt-2 text-lg font-semibold">{data.policies.dashboardCacheTtlSec}s</p>
            </div>
            <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">System cache</p>
              <p className="mt-2 text-lg font-semibold">{data.policies.systemCacheTtlSec}s</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="space-y-2">
            <CardTitle>Son hatalar</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatDateTime(data.generatedAt)} tarihinde olusturuldu.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentErrors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                Son hata kaydi bulunmuyor.
              </div>
            ) : (
              data.recentErrors.map((error, index) => (
                <div key={`${error.timestamp}-${index}`} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium">{error.message}</p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(error.timestamp)}</span>
                  </div>
                  {error.meta ? (
                    <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/95 p-3 text-xs text-slate-100">
                      {JSON.stringify(error.meta, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
