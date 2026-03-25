import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Bookmark,
  Clock3,
  Download,
  Goal,
  History,
  KeyRound,
  Laptop,
  ShieldCheck,
  Wallet,
  WalletCards,
} from "lucide-react"
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminUserActions } from "@/components/admin/admin-user-actions"
import { AdminUserNotesPanel } from "@/components/admin/admin-user-notes-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdminPageSession } from "@/lib/admin/auth"
import {
  formatAdminRole,
  formatApprovalActionType,
  formatApprovalStatus,
} from "@/lib/admin/labels"
import { getAdminUserDetailData } from "@/lib/admin/user-detail"
import { formatCurrency, formatDateTime } from "@/lib/utils"
import type { AdminApprovalRequestSummary, AdminUserRole } from "@/types/admin"

type RouteParams = Promise<{
  id: string
}>

const transactionTypeLabel = {
  INCOME: "Gelir",
  EXPENSE: "Gider",
} as const

function formatMoney(value: number | null, visible: boolean) {
  return visible && value !== null ? formatCurrency(value) : "Gizli"
}

function getRoleBadgeVariant(role: AdminUserRole) {
  return role === "USER" ? "secondary" : "default"
}

function getApprovalStatusVariant(request: AdminApprovalRequestSummary) {
  switch (request.status) {
    case "APPROVED":
      return "success" as const
    case "REJECTED":
    case "EXPIRED":
      return "warning" as const
    default:
      return request.isSensitive ? ("warning" as const) : ("secondary" as const)
  }
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: RouteParams
}) {
  const { admin } = await requireAdminPageSession("users:view")
  const { id } = await params
  const detail = await getAdminUserDetailData({
    userId: id,
    viewer: {
      id: admin.id,
      role: admin.role,
    },
  })

  if (!detail) {
    notFound()
  }

  const topCategoryMax = Math.max(
    1,
    ...detail.topCategories.map((category) =>
      detail.sensitiveDataVisible ? (category.totalAmount ?? 0) : category.transactionCount
    )
  )
  const showActionPanel =
    detail.canRequestUserOps || detail.canRevokeSessions || detail.canRequestRawExport

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Kullanici detayi"
        title={detail.user.email}
        description="Kullanici profili, davranis ritmi, cihaz gecmisi, onay akisi ve internal operasyon notlarini tek ekranda inceleyin."
        actions={(
          <>
            <Badge variant={getRoleBadgeVariant(detail.user.role)}>{formatAdminRole(detail.user.role)}</Badge>
            <Badge variant={detail.user.isActive ? "success" : "warning"}>
              {detail.user.isActive ? "Aktif" : "Pasif"}
            </Badge>
            {detail.approvedRawExport ? (
              <Button variant="outline" asChild>
                <a href={detail.approvedRawExport.url}>
                  <Download className="h-4 w-4" />
                  Onayli exportu indir
                </a>
              </Button>
            ) : null}
            <Button variant="outline" asChild>
              <Link href={`/admin/activity?target=${encodeURIComponent(detail.user.email)}`}>
                <History className="h-4 w-4" />
                Audit akisini ac
              </Link>
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Islemler</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{detail.stats.totalTransactions}</p>
              <p className="text-sm text-muted-foreground">toplam kayit</p>
            </div>
            <Wallet className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gelir</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">
                {formatMoney(detail.stats.totalIncome, detail.sensitiveDataVisible)}
              </p>
              <p className="text-sm text-muted-foreground">
                {detail.sensitiveDataVisible ? "kayitli giris" : "masked gorunum"}
              </p>
            </div>
            <WalletCards className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gider</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">
                {formatMoney(detail.stats.totalExpense, detail.sensitiveDataVisible)}
              </p>
              <p className="text-sm text-muted-foreground">
                {detail.sensitiveDataVisible ? "kayitli cikis" : "masked gorunum"}
              </p>
            </div>
            <Bookmark className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Hedefler ve kategoriler</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">
                {detail.stats.goalCount} / {detail.stats.categoryCount}
              </p>
              <p className="text-sm text-muted-foreground">hedef ve kategori sayisi</p>
            </div>
            <Goal className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader className="space-y-2">
              <CardTitle>Hesap profili</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ad soyad</p>
                <p className="mt-1 font-medium">{detail.user.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Olusturma</p>
                <p className="mt-1 font-medium">{formatDateTime(detail.user.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Son giris</p>
                <p className="mt-1 font-medium">
                  {detail.user.lastLoginAt ? formatDateTime(detail.user.lastLoginAt) : "Henuz giris yok"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Session version</p>
                <p className="mt-1 font-medium">{detail.user.sessionVersion}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <CardTitle>Davranissal pencere</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {detail.windows.map((window) => (
                <div key={window.days} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Son {window.days} gun</p>
                      <p className="text-sm text-muted-foreground">{window.transactionCount} islem</p>
                    </div>
                    <Badge variant="secondary">{window.days}g</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Gelir</p>
                      <p className="mt-1 font-semibold">
                        {formatMoney(window.totalIncome, detail.sensitiveDataVisible)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Gider</p>
                      <p className="mt-1 font-semibold">
                        {formatMoney(window.totalExpense, detail.sensitiveDataVisible)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <CardTitle>Son cihazlar ve oturum izleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.recentDevices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-muted-foreground">
                  Henuz login cihaz kaydi gorunmuyor.
                </div>
              ) : (
                detail.recentDevices.map((device, index) => (
                  <div key={`${device.ipAddress ?? "ip"}-${index}`} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Laptop className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold">{device.ipAddress ?? "IP bilinmiyor"}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{device.userAgent ?? "User-Agent kaydi yok"}</p>
                      </div>
                      <Badge variant="secondary">{device.loginCount} giris</Badge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Son gorulme: {formatDateTime(device.lastSeenAt)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {showActionPanel ? (
            <AdminUserActions
              userId={detail.user.id}
              role={detail.user.role}
              isActive={detail.user.isActive}
              isSelf={admin.id === detail.user.id}
              viewerRole={admin.role}
              canRequestUserOps={detail.canRequestUserOps}
              canManageStaffRoles={detail.canManageStaffRoles}
              canRevokeSessions={detail.canRevokeSessions}
              canRequestRawExport={detail.canRequestRawExport}
            />
          ) : null}

          <AdminUserNotesPanel
            userId={detail.user.id}
            notes={detail.notes}
            canCreate={detail.canCreateNotes}
          />

          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <CardTitle>En cok harcanan kategoriler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henuz kategori analitigi yok.</p>
              ) : (
                detail.topCategories.map((category) => {
                  const metric = detail.sensitiveDataVisible ? category.totalAmount ?? 0 : category.transactionCount

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{category.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category.parentName ? `${category.parentName} | ` : ""}
                            {category.transactionCount} islem
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {detail.sensitiveDataVisible ? formatCurrency(metric) : `${category.transactionCount} islem`}
                        </p>
                      </div>
                      <Progress value={(metric / topCategoryMax) * 100} className="h-2.5" />
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <CardTitle>Son islemler</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tur</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {transaction.type in transactionTypeLabel
                          ? transactionTypeLabel[transaction.type as keyof typeof transactionTypeLabel]
                          : transaction.type}
                      </TableCell>
                      <TableCell>{transaction.categoryName ?? "Kategorisiz"}</TableCell>
                      <TableCell>{formatDateTime(transaction.date)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {detail.sensitiveDataVisible && transaction.amount !== null
                          ? formatCurrency(transaction.amount)
                          : "Gizli"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <CardTitle>Son onay istekleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.recentApprovalRequests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-muted-foreground">
                  Bu kullanici icin son onay kaydi bulunmuyor.
                </div>
              ) : (
                detail.recentApprovalRequests.map((request) => (
                  <div key={request.id} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getApprovalStatusVariant(request)}>
                            {formatApprovalStatus(request.status)}
                          </Badge>
                          <Badge variant="secondary">{formatApprovalActionType(request.actionType)}</Badge>
                        </div>
                        <p className="text-sm font-semibold">{request.requestedBy.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(request.createdAt)}</p>
                      </div>
                      {request.availableDownload ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={request.availableDownload.url}>
                            <Download className="h-4 w-4" />
                            Exportu indir
                          </a>
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      {request.summaryLines.map((line) => (
                        <p key={`${request.id}-${line}`}>{line}</p>
                      ))}
                    </div>

                    {request.reason ? (
                      <div className="mt-4 rounded-xl border border-white/[0.08] bg-card/70 p-3 text-sm text-muted-foreground">
                        Istek notu: {request.reason}
                      </div>
                    ) : null}

                    {request.rejectionReason ? (
                      <div className="mt-3 rounded-xl border border-white/[0.08] bg-card/70 p-3 text-sm text-muted-foreground">
                        Reddetme notu: {request.rejectionReason}
                      </div>
                    ) : null}

                    {request.approvedBy ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Karari veren: {request.approvedBy.name} | {formatDateTime(request.decidedAt ?? request.createdAt)}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Son gecerlilik: {formatDateTime(request.expiresAt)}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <CardTitle>Son yonetsel degisiklikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.recentAdminChanges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-muted-foreground">
                  Henuz yonetsel degisiklik kaydi yok.
                </div>
              ) : (
                detail.recentAdminChanges.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.actorName} | {formatDateTime(item.createdAt)}
                        </p>
                      </div>
                      <ShieldCheck className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-white/[0.08] bg-card/90">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 text-primary" />
                <CardTitle>Oturum ve event timeline</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Session version: {detail.user.sessionVersion}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Session revoke aksiyonu uygulandiginda bu sayi artar ve eski tokenlar gecersiz hale gelir.
                </p>
              </div>
            </CardContent>
          </Card>

          <AdminActivityFeed items={detail.recentActivity} />
        </div>
      </div>
    </div>
  )
}
