import Link from "next/link"
import { redirect } from "next/navigation"
import { Download, RotateCcw, Search } from "lucide-react"
import { AdminPagination } from "@/components/admin/admin-pagination"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminSavedViewsBar } from "@/components/admin/admin-saved-views-bar"
import { AdminUsersTable } from "@/components/admin/admin-users-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { requireAdminPageSession } from "@/lib/admin/auth"
import { hasPermission } from "@/lib/admin/permissions"
import { getSingleSearchParam } from "@/lib/admin/query"
import { getAdminDefaultSavedView, getAdminSavedViews, getAdminUsersData } from "@/lib/admin/data"
import { adminUsersFiltersSchema } from "@/lib/validations"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const quickSegments = [
  {
    label: "Tum hesaplar",
    href: "/admin/users",
  },
  {
    label: "Staff hesaplari",
    href: "/admin/users?role=staff",
  },
  {
    label: "Pasif hesaplar",
    href: "/admin/users?status=inactive",
  },
  {
    label: "Yeni hesaplar",
    href: "/admin/users?sort=createdAt&direction=desc",
  },
] as const

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { admin } = await requireAdminPageSession("users:view")
  const resolvedSearchParams = await searchParams
  const hasExplicitFilters = Boolean(
    getSingleSearchParam(resolvedSearchParams.query) ||
      getSingleSearchParam(resolvedSearchParams.role) ||
      getSingleSearchParam(resolvedSearchParams.status) ||
      getSingleSearchParam(resolvedSearchParams.sort) ||
      getSingleSearchParam(resolvedSearchParams.direction)
  )

  if (!hasExplicitFilters) {
    const defaultView = await getAdminDefaultSavedView("USERS")
    if (defaultView && Object.keys(defaultView.filters).length > 0) {
      redirect(defaultView.href)
    }
  }

  const filters = adminUsersFiltersSchema.parse({
    query: getSingleSearchParam(resolvedSearchParams.query) ?? undefined,
    role: getSingleSearchParam(resolvedSearchParams.role) ?? undefined,
    status: getSingleSearchParam(resolvedSearchParams.status) ?? undefined,
    sort: getSingleSearchParam(resolvedSearchParams.sort) ?? undefined,
    direction: getSingleSearchParam(resolvedSearchParams.direction) ?? undefined,
    page: getSingleSearchParam(resolvedSearchParams.page) ?? undefined,
  })

  const [data, savedViews] = await Promise.all([
    getAdminUsersData(filters),
    getAdminSavedViews("USERS", admin.role),
  ])

  const currentQuery = new URLSearchParams({
    ...(filters.query ? { query: filters.query } : {}),
    ...(filters.role !== "all" ? { role: filters.role } : {}),
    ...(filters.status !== "all" ? { status: filters.status } : {}),
    ...(filters.sort !== "createdAt" ? { sort: filters.sort } : {}),
    ...(filters.direction !== "desc" ? { direction: filters.direction } : {}),
  }).toString()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Kullanici yonetimi"
        title="Gelismis kullanici listesi"
        description="Arama, durum/rol filtreleme, siralama, kayitli gorunumler ve audit kisayollari ile kullanici operasyonlarini derinlestirin."
        actions={(
          <>
            <Button variant="outline" asChild>
              <Link href={`/api/admin/users${currentQuery ? `?${currentQuery}` : ""}`}>
                <Download className="h-4 w-4" />
                JSON gorunumu
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/users">
                <RotateCcw className="h-4 w-4" />
                Filtreleri sifirla
              </Link>
            </Button>
          </>
        )}
      />

      <div className="rounded-[26px] border border-white/[0.12] bg-card/70 backdrop-blur-xl dark:border-white/[0.06] p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {quickSegments.map((segment) => (
            <Button key={segment.label} asChild variant="outline" size="sm" className="rounded-full">
              <Link href={segment.href}>{segment.label}</Link>
            </Button>
          ))}
        </div>

        <form className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_180px_180px_180px_160px_auto]">
          <div className="space-y-2">
            <label htmlFor="query" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              E-posta veya ad
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="query" name="query" defaultValue={filters.query} placeholder="ornek@firma.com" className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Rol
            </label>
            <select
              id="role"
              name="role"
              defaultValue={filters.role}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tum roller</option>
              <option value="USER">Kullanici</option>
              <option value="SUPPORT">Destek</option>
              <option value="ANALYST">Analist</option>
              <option value="OPS_ADMIN">Operasyon Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="staff">Tum staff</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Durum
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Tum durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="sort" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Siralama
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="createdAt">Olusturma</option>
              <option value="lastLoginAt">Son giris</option>
              <option value="transactionCount">Islem sayisi</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="direction" className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Yon
            </label>
            <select
              id="direction"
              name="direction"
              defaultValue={filters.direction}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full lg:w-auto">
              Uygula
            </Button>
          </div>
        </form>
      </div>

      <AdminSavedViewsBar
        scope="USERS"
        views={savedViews}
        currentFilters={{
          query: filters.query || undefined,
          role: filters.role !== "all" ? filters.role : undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          sort: filters.sort !== "createdAt" ? filters.sort : undefined,
          direction: filters.direction !== "desc" ? filters.direction : undefined,
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{data.pagination.total} kayit</Badge>
        <Badge variant="secondary">Sayfa basi {data.pagination.limit}</Badge>
        <Badge variant="secondary">
          Siralama: {filters.sort} / {filters.direction}
        </Badge>
      </div>

      <AdminUsersTable users={data.items} canBulkUpdate={hasPermission(admin.role, "users:bulk:update")} />

      {data.pagination.totalPages > 1 ? (
        <AdminPagination
          pathname="/admin/users"
          page={data.pagination.page}
          totalPages={data.pagination.totalPages}
          searchParams={{
            query: filters.query || undefined,
            role: filters.role !== "all" ? filters.role : undefined,
            status: filters.status !== "all" ? filters.status : undefined,
            sort: filters.sort !== "createdAt" ? filters.sort : undefined,
            direction: filters.direction !== "desc" ? filters.direction : undefined,
          }}
        />
      ) : null}
    </div>
  )
}
