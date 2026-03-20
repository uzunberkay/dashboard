import Link from "next/link"
import { notFound } from "next/navigation"
import { Bookmark, Goal, History, ShieldCheck, Wallet, WalletCards } from "lucide-react"
import { AdminActivityFeed } from "@/components/admin/admin-activity-feed"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { AdminUserActions } from "@/components/admin/admin-user-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { requireAdminPageSession } from "@/lib/admin/auth"
import { getAdminUserDetailData } from "@/lib/admin/data"
import { formatAdminRole } from "@/lib/admin/labels"
import { formatCurrency, formatDateTime } from "@/lib/utils"

type RouteParams = Promise<{
  id: string
}>

const transactionTypeLabel = {
  INCOME: "Gelir",
  EXPENSE: "Gider",
} as const

export default async function AdminUserDetailPage({
  params,
}: {
  params: RouteParams
}) {
  const { admin } = await requireAdminPageSession()
  const { id } = await params
  const detail = await getAdminUserDetailData(id)

  if (!detail) {
    notFound()
  }

  const topCategoryMax = detail.topCategories[0]?.totalAmount ?? 1

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Kullanici detayi"
        title={detail.user.email}
        description="Kullanici profili, finansal davranis, yonetsel degisiklikler ve audit akislarini tek ekrandan inceleyin."
        actions={(
          <>
            <Badge variant={detail.user.role === "ADMIN" ? "default" : "secondary"}>
              {formatAdminRole(detail.user.role)}
            </Badge>
            <Badge variant={detail.user.isActive ? "success" : "warning"}>
              {detail.user.isActive ? "Aktif" : "Pasif"}
            </Badge>
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
        <Card className="rounded-[24px] border-border/70 bg-card/90">
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

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gelir</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{formatCurrency(detail.stats.totalIncome)}</p>
              <p className="text-sm text-muted-foreground">kayitli giris</p>
            </div>
            <WalletCards className="h-5 w-5 text-emerald-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Gider</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold">{formatCurrency(detail.stats.totalExpense)}</p>
              <p className="text-sm text-muted-foreground">kayitli cikis</p>
            </div>
            <Bookmark className="h-5 w-5 text-amber-500" />
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-border/70 bg-card/90">
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

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card className="rounded-[24px] border-border/70 bg-card/90">
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
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Davranissal pencere</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {detail.windows.map((window) => (
                <div key={window.days} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
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
                      <p className="mt-1 font-semibold">{formatCurrency(window.totalIncome)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Gider</p>
                      <p className="mt-1 font-semibold">{formatCurrency(window.totalExpense)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <AdminUserActions
            userId={detail.user.id}
            role={detail.user.role}
            isActive={detail.user.isActive}
            isSelf={admin.id === detail.user.id}
          />

          <Card className="rounded-[24px] border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>En cok harcanan kategoriler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henuz kategori analitigi yok.</p>
              ) : (
                detail.topCategories.map((category) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {category.parentName ? `${category.parentName} | ` : ""}
                          {category.transactionCount} islem
                        </p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(category.totalAmount)}</p>
                    </div>
                    <Progress value={(category.totalAmount / topCategoryMax) * 100} className="h-2.5" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[24px] border-border/70 bg-card/90">
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
                      <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border-border/70 bg-card/90">
            <CardHeader>
              <CardTitle>Son yonetsel degisiklikler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {detail.recentAdminChanges.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  Henuz yonetsel degisiklik kaydi yok.
                </div>
              ) : (
                detail.recentAdminChanges.map((item) => (
                  <div key={item.id} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
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

          <AdminActivityFeed items={detail.recentActivity} />
        </div>
      </div>
    </div>
  )
}
