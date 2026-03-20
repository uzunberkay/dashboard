"use client"

import Link from "next/link"
import { AlertTriangle, ArrowRight, PiggyBank, ShieldCheck } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/utils"
import type { BudgetStatus, DashboardGoalProgress } from "@/types"

interface DashboardRiskPanelProps {
  budgetStatuses: BudgetStatus[]
  monthlyGoalProgress: DashboardGoalProgress | null
}

function resolveProgressColor(status: "safe" | "warning" | "danger") {
  if (status === "danger") {
    return "bg-expense"
  }

  if (status === "warning") {
    return "bg-warning"
  }

  return "bg-income"
}

export function DashboardRiskPanel({
  budgetStatuses,
  monthlyGoalProgress,
}: DashboardRiskPanelProps) {
  const alertItems = budgetStatuses.filter((item) => item.status !== "safe").slice(0, 4)
  const hasSignals = alertItems.length > 0 || monthlyGoalProgress !== null

  return (
    <Card className="h-full rounded-[24px] border-border/70 bg-card/95">
      <CardHeader className="space-y-1 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <CardTitle className="text-base font-semibold">Riskler ve firsatlar</CardTitle>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Butce sinirlari ve aylik hedefler ayni panelde okunur.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        {!hasSignals ? (
          <div className="rounded-[22px] border border-dashed border-border/80 bg-background/45 p-5 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-income" />
            <p className="mt-3 text-sm font-semibold">Su anda kritik bir sinyal yok</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Yeni hedef ekleyerek veya kategori limitlerini guncelleyerek daha net yonlendirme alabilirsiniz.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/budgets" prefetch>
                  Hedefleri duzenle
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/categories" prefetch>
                  Kategorilere git
                </Link>
              </Button>
            </div>
          </div>
        ) : null}

        {alertItems.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Butce sinirlari</p>
              <StatusBadge
                tone={alertItems.some((item) => item.status === "danger") ? "danger" : "warning"}
                label={`${alertItems.length} aktif sinyal`}
              />
            </div>
            {alertItems.map((item) => (
              <div
                key={item.categoryId}
                className="rounded-[20px] border border-border/70 bg-background/55 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{item.categoryName}</p>
                  <StatusBadge
                    tone={item.status === "danger" ? "danger" : "warning"}
                    label={item.status === "danger" ? "Asim" : "Yaklasiyor"}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatCurrency(item.totalSpent)} / {formatCurrency(item.budgetLimit)}
                </p>
                <Progress
                  className="mt-3"
                  value={Math.min(item.percentage, 100)}
                  indicatorClassName={resolveProgressColor(item.status)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {monthlyGoalProgress ? (
          <div className="rounded-[22px] border border-border/70 bg-background/55 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Aylik toplam hedef</p>
              </div>
              <StatusBadge
                tone={
                  monthlyGoalProgress.status === "danger"
                    ? "danger"
                    : monthlyGoalProgress.status === "warning"
                      ? "warning"
                      : "success"
                }
                label={
                  monthlyGoalProgress.status === "danger"
                    ? "Geride"
                    : monthlyGoalProgress.status === "warning"
                      ? "Izlenmeli"
                      : "Yolunda"
                }
              />
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Mevcut durum</p>
                <p className="text-xl font-semibold tracking-tight">
                  {formatCurrency(monthlyGoalProgress.currentAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Hedef</p>
                <p className="text-sm font-medium">
                  {formatCurrency(monthlyGoalProgress.targetAmount)}
                </p>
              </div>
            </div>
            <Progress
              className="mt-4"
              value={Math.min(monthlyGoalProgress.percentage, 100)}
              indicatorClassName={resolveProgressColor(monthlyGoalProgress.status)}
            />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {monthlyGoalProgress.remainingAmount >= 0
                ? `${formatCurrency(monthlyGoalProgress.remainingAmount)} kadar alan kaldi.`
                : `${formatCurrency(Math.abs(monthlyGoalProgress.remainingAmount))} kadar hedef asin durumda.`}
            </p>
          </div>
        ) : hasSignals ? (
          <div className="rounded-[22px] border border-dashed border-border/80 bg-background/40 p-4 text-sm text-muted-foreground">
            Bu ay icin tanimli toplam hedef yok. Hedef eklerseniz ilerleme takibi burada gorunur.
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
