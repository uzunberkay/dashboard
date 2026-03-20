import { redirect } from "next/navigation"
import {
  ArrowLeftRight,
  Goal,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react"
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed"
import { AdminAnomalyPanel } from "@/components/admin/admin-anomaly-panel"
import { AdminKpiCard } from "@/components/admin/admin-kpi-card"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminSavedViewsBar } from "@/components/admin/admin-saved-views-bar"
import { AdminTopCategoriesPanel } from "@/components/admin/admin-top-categories-panel"
import { AdminTrendChartPanel } from "@/components/admin/admin-trend-chart-panel"
import { Button } from "@/components/ui/button"
import { getSingleSearchParam } from "@/lib/admin/query"
import {
  getAdminDashboardData,
  getAdminDefaultSavedView,
  getAdminSavedViews,
  getAdminSettingValues,
} from "@/lib/admin/data"
import { adminDashboardFiltersSchema } from "@/lib/validations"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const hasExplicitFilters = Boolean(
    getSingleSearchParam(resolvedSearchParams.range) || getSingleSearchParam(resolvedSearchParams.segment)
  )

  if (!hasExplicitFilters) {
    const defaultView = await getAdminDefaultSavedView("DASHBOARD")
    if (defaultView && Object.keys(defaultView.filters).length > 0) {
      redirect(defaultView.href)
    }
  }

  const settings = await getAdminSettingValues()
  const filters = adminDashboardFiltersSchema.parse({
    range: getSingleSearchParam(resolvedSearchParams.range) ?? settings.dashboardDefaultRange,
    segment: getSingleSearchParam(resolvedSearchParams.segment) ?? "all",
  })

  const [data, savedViews] = await Promise.all([
    getAdminDashboardData(filters),
    getAdminSavedViews("DASHBOARD"),
  ])

  const numberFormatter = new Intl.NumberFormat("tr-TR")

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Kontrol merkezi"
        title="Platform yonetim genel gorunumu"
        description="Kullanici buyumesini, urun benimsemesini, finansal ritmi ve operasyon sagligini tek bir profesyonel yonetim alanindan izleyin."
        actions={(
          <Button variant="outline" asChild>
            <a href={`/api/admin/dashboard?range=${filters.range}&segment=${filters.segment}`}>JSON gorunumu</a>
          </Button>
        )}
      />

      <div className="rounded-[26px] border border-border/70 bg-card/85 p-5 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[220px_220px_auto]">
          <div className="space-y-2">
            <label htmlFor="range" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Zaman araligi
            </label>
            <select
              id="range"
              name="range"
              defaultValue={filters.range}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="7d">Son 7 gun</option>
              <option value="30d">Son 30 gun</option>
              <option value="90d">Son 90 gun</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="segment" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Segment
            </label>
            <select
              id="segment"
              name="segment"
              defaultValue={filters.segment}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tum kullanicilar</option>
              <option value="active">Aktif hesaplar</option>
              <option value="inactive">Pasif hesaplar</option>
              <option value="admin">Yonetici hesaplari</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full lg:w-auto">
              Dashboardu uygula
            </Button>
          </div>
        </form>
      </div>

      <AdminSavedViewsBar
        scope="DASHBOARD"
        views={savedViews}
        currentFilters={{
          range: filters.range,
          segment: filters.segment,
        }}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminKpiCard
          label="Toplam kullanici"
          value={numberFormatter.format(data.summary.totalUsers)}
          hint="Secili segmente dahil tum hesaplar."
          icon={Users}
        />
        <AdminKpiCard
          label="Aktif kullanici"
          value={numberFormatter.format(data.summary.activeUsers)}
          hint="Secili aralikta giris yapan hesaplar."
          icon={UserCheck}
          tone="success"
        />
        <AdminKpiCard
          label="Yeni kullanici"
          value={numberFormatter.format(data.summary.newUsers)}
          hint="Secili aralikta olusan hesaplar."
          icon={UserPlus}
        />
        <AdminKpiCard
          label="Toplam islem"
          value={numberFormatter.format(data.summary.totalTransactions)}
          hint="Secili aralikta kayit altina alinan finansal hareket."
          icon={ArrowLeftRight}
        />
        <AdminKpiCard
          label="Hedef kullanim orani"
          value={`%${data.summary.goalUsageRate}`}
          hint="Hedef tanimlamis kullanicilarin orani."
          icon={Goal}
          tone="warning"
        />
        <AdminKpiCard
          label="Aktif basina islem"
          value={numberFormatter.format(data.summary.transactionsPerActiveUser)}
          hint="Aktif kullanici yogunlugunu okumak icin normalize metrik."
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <AdminTrendChartPanel data={data.trend} />
        <AdminTopCategoriesPanel items={data.topCategories} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <AdminAnomalyPanel items={data.anomalies} />
        <AdminActivityFeed items={data.recentActivity} />
      </div>
    </div>
  )
}
