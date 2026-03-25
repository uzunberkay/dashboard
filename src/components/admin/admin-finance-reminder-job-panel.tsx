"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Play, ShieldCheck, TriangleAlert } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import type { AdminSystemData } from "@/types/admin"

interface AdminFinanceReminderJobPanelProps {
  job: AdminSystemData["financeReminderJob"]
  canRunJob: boolean
}

type JobRunResponse = {
  processed?: number
  error?: string
}

export function AdminFinanceReminderJobPanel({
  job,
  canRunJob,
}: AdminFinanceReminderJobPanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function runJob() {
    if (!canRunJob) {
      return
    }

    startTransition(async () => {
      const response = await fetch("/api/jobs/finance-reminders", {
        method: "POST",
      })

      const result = (await response.json()) as JobRunResponse
      if (!response.ok) {
        toast({
          title: "Job calistirilamadi",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Finance reminder job calisti",
        description: `${result.processed ?? 0} reminder isledi.`,
        variant: "success",
      })

      router.refresh()
    })
  }

  const statusBadge =
    job.lastStatus === "success" ? (
      <Badge variant="success">Basarili</Badge>
    ) : job.lastStatus === "failed" ? (
      <Badge variant="warning">Hatali</Badge>
    ) : (
      <Badge variant="secondary">Henuz calismadi</Badge>
    )

  return (
    <Card className="rounded-[24px] border-border/70 bg-card/90">
      <CardHeader>
        <div className="flex items-center gap-3">
          {job.lastStatus === "failed" ? (
            <TriangleAlert className="h-5 w-5 text-amber-500" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          )}
          <CardTitle>Finance reminder job</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {statusBadge}
          {canRunJob ? (
            <Button onClick={runJob} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Jobu tekrar calistir
            </Button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Son calisma</p>
            <p className="mt-2 text-sm font-medium">
              {job.lastRunAt ? formatDateTime(job.lastRunAt) : "Kayit yok"}
            </p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Islenen reminder</p>
            <p className="mt-2 text-sm font-medium">{job.lastProcessedCount ?? 0}</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
            <p className="mt-2 text-sm font-medium">{job.pendingReminderCount}</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Failed</p>
            <p className="mt-2 text-sm font-medium">{job.failedReminderCount}</p>
          </div>
        </div>

        {job.lastError ? (
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Son hata: {job.lastError}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
