import Link from "next/link"
import { redirect } from "next/navigation"
import { Download, RotateCcw, Search } from "lucide-react"
import { AdminActivityTable } from "@/components/admin/admin-activity-table"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { AdminSavedViewsBar } from "@/components/admin/admin-saved-views-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requireAdminPageSession } from "@/lib/admin/auth"
import { getSingleSearchParam } from "@/lib/admin/query"
import { getAdminActivityData, getAdminDefaultSavedView, getAdminSavedViews } from "@/lib/admin/data"
import { adminActivityFiltersSchema } from "@/lib/validations"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const eventOptions = [
  { value: "all", label: "Tum olaylar" },
  { value: "LOGIN", label: "Giris" },
  { value: "USER_CREATED", label: "Kullanici olustu" },
  { value: "USER_STATUS_CHANGED", label: "Durum degisti" },
  { value: "USER_ROLE_CHANGED", label: "Rol degisti" },
  { value: "BULK_USER_UPDATED", label: "Toplu kullanici islemi" },
  { value: "ADMIN_SETTINGS_UPDATED", label: "Admin ayarlari" },
  { value: "ADMIN_EXPORT_CREATED", label: "Export" },
  { value: "SAVED_VIEW_CREATED", label: "Gorunum olustu" },
  { value: "SAVED_VIEW_UPDATED", label: "Gorunum guncellendi" },
  { value: "SAVED_VIEW_DELETED", label: "Gorunum silindi" },
  { value: "APPROVAL_REQUESTED", label: "Onay istendi" },
  { value: "APPROVAL_APPROVED", label: "Onaylandi" },
  { value: "APPROVAL_REJECTED", label: "Onay reddi" },
  { value: "USER_NOTE_CREATED", label: "Internal not" },
  { value: "USER_SESSIONS_REVOKED", label: "Oturum kapatma" },
  { value: "RAW_EXPORT_REQUESTED", label: "Ham export istegi" },
  { value: "RAW_EXPORT_DOWNLOADED", label: "Ham export indirildi" },
  { value: "FINANCE_REMINDER_JOB_SUCCEEDED", label: "Finance job basarili" },
  { value: "FINANCE_REMINDER_JOB_FAILED", label: "Finance job hatasi" },
] as const

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { admin } = await requireAdminPageSession("activity:view")
  const resolvedSearchParams = await searchParams
  const hasExplicitFilters = Boolean(
    getSingleSearchParam(resolvedSearchParams.event) ||
      getSingleSearchParam(resolvedSearchParams.actor) ||
      getSingleSearchParam(resolvedSearchParams.target) ||
      getSingleSearchParam(resolvedSearchParams.from) ||
      getSingleSearchParam(resolvedSearchParams.to) ||
      getSingleSearchParam(resolvedSearchParams.ip) ||
      getSingleSearchParam(resolvedSearchParams.query)
  )

  if (!hasExplicitFilters) {
    const defaultView = await getAdminDefaultSavedView("ACTIVITY")
    if (defaultView && Object.keys(defaultView.filters).length > 0) {
      redirect(defaultView.href)
    }
  }

  const filters = adminActivityFiltersSchema.parse({
    event: getSingleSearchParam(resolvedSearchParams.event) ?? undefined,
    actor: getSingleSearchParam(resolvedSearchParams.actor) ?? undefined,
    target: getSingleSearchParam(resolvedSearchParams.target) ?? undefined,
    from: getSingleSearchParam(resolvedSearchParams.from) ?? undefined,
    to: getSingleSearchParam(resolvedSearchParams.to) ?? undefined,
    ip: getSingleSearchParam(resolvedSearchParams.ip) ?? undefined,
    query: getSingleSearchParam(resolvedSearchParams.query) ?? undefined,
    page: getSingleSearchParam(resolvedSearchParams.page) ?? undefined,
  })

  const [data, savedViews] = await Promise.all([
    getAdminActivityData(filters),
    getAdminSavedViews("ACTIVITY", admin.role),
  ])

  const currentQuery = new URLSearchParams({
    ...(filters.event !== "all" ? { event: filters.event } : {}),
    ...(filters.actor ? { actor: filters.actor } : {}),
    ...(filters.target ? { target: filters.target } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(filters.ip ? { ip: filters.ip } : {}),
    ...(filters.query ? { query: filters.query } : {}),
  }).toString()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Audit merkezi"
        title="Filtrelenebilir aktivite explorer"
        description="Actor, target, tarih, IP ve olay tipine gore aktiviteleri inceleyin; detay drawer'i ve CSV export ile denetim akislarini hizlandirin."
        actions={(
          <>
            <Button variant="outline" asChild>
              <Link href={`/api/admin/activity${currentQuery ? `?${currentQuery}` : ""}`}>JSON gorunumu</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/api/admin/activity/export${currentQuery ? `?${currentQuery}` : ""}`}>
                <Download className="h-4 w-4" />
                CSV export
              </Link>
            </Button>
          </>
        )}
      />

      <div className="rounded-[26px] border border-white/[0.12] bg-card/70 backdrop-blur-xl dark:border-white/[0.06] p-5 shadow-sm">
        <form className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_minmax(0,1fr)_170px_170px_170px_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <label htmlFor="event" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Olay
            </label>
            <select
              id="event"
              name="event"
              defaultValue={filters.event}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="actor" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Actor
            </label>
            <Input id="actor" name="actor" defaultValue={filters.actor} placeholder="admin veya e-posta" />
          </div>

          <div className="space-y-2">
            <label htmlFor="target" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Target
            </label>
            <Input id="target" name="target" defaultValue={filters.target} placeholder="kullanici veya e-posta" />
          </div>

          <div className="space-y-2">
            <label htmlFor="from" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Baslangic
            </label>
            <Input id="from" name="from" type="date" defaultValue={filters.from} />
          </div>

          <div className="space-y-2">
            <label htmlFor="to" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Bitis
            </label>
            <Input id="to" name="to" type="date" defaultValue={filters.to} />
          </div>

          <div className="space-y-2">
            <label htmlFor="ip" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              IP
            </label>
            <Input id="ip" name="ip" defaultValue={filters.ip} placeholder="192.168..." />
          </div>

          <div className="space-y-2">
            <label htmlFor="query" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Serbest arama
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="query" name="query" defaultValue={filters.query} className="pl-10" placeholder="actor, target, ip, user-agent" />
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full lg:w-auto">
              Uygula
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/activity">
                <RotateCcw className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </form>
      </div>

      <AdminSavedViewsBar
        scope="ACTIVITY"
        views={savedViews}
        currentFilters={{
          event: filters.event !== "all" ? filters.event : undefined,
          actor: filters.actor || undefined,
          target: filters.target || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          ip: filters.ip || undefined,
          query: filters.query || undefined,
        }}
      />

      <AdminActivityTable items={data.items} />

      {data.pagination.totalPages > 1 ? (
        <AdminPagination
          pathname="/admin/activity"
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          searchParams={{
            event: filters.event !== "all" ? filters.event : undefined,
            actor: filters.actor || undefined,
            target: filters.target || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
            ip: filters.ip || undefined,
            query: filters.query || undefined,
          }}
        />
      ) : null}
    </div>
  )
}
