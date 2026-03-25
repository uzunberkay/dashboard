"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, Clock3, Download, Loader2, XCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatAdminRole,
  formatApprovalActionType,
  formatApprovalStatus,
} from "@/lib/admin/labels"
import { formatDateTime } from "@/lib/utils"
import type { AdminApprovalQueueData, AdminApprovalRequestSummary } from "@/types/admin"

interface AdminApprovalQueueProps {
  data: AdminApprovalQueueData
}

type DecisionResponse = {
  ok?: boolean
  mode?: "approval_requested" | "completed"
  message?: string
  error?: string
}

function RequestCard({
  request,
  isPending,
  onApprove,
  onReject,
}: {
  request: AdminApprovalRequestSummary
  isPending: boolean
  onApprove: (request: AdminApprovalRequestSummary) => void
  onReject: (request: AdminApprovalRequestSummary) => void
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant={request.status === "APPROVED" ? "success" : request.status === "PENDING" ? "secondary" : "warning"}>
              {formatApprovalStatus(request.status)}
            </Badge>
            <Badge variant="outline">{formatApprovalActionType(request.actionType)}</Badge>
            {request.isSensitive ? <Badge variant="warning">Sensitive</Badge> : null}
          </div>
          <div>
            <p className="text-sm font-semibold">
              {request.targetUser?.name ?? "Hedef hesap yok"}
              {request.targetUser?.email ? ` | ${request.targetUser.email}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Istek sahibi: {request.requestedBy.name} ({formatAdminRole(request.requestedBy.role)})
            </p>
          </div>
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
        <div className="mt-4 rounded-xl border border-border/70 bg-card/80 p-3 text-sm text-muted-foreground">
          Istek notu: {request.reason}
        </div>
      ) : null}

      {request.rejectionReason ? (
        <div className="mt-3 rounded-xl border border-border/70 bg-card/80 p-3 text-sm text-muted-foreground">
          Reddetme notu: {request.rejectionReason}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Olusturma: {formatDateTime(request.createdAt)}</span>
        <span>Sure sonu: {formatDateTime(request.expiresAt)}</span>
        {request.decidedAt ? <span>Karar: {formatDateTime(request.decidedAt)}</span> : null}
      </div>

      {request.status === "PENDING" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={isPending || !request.canApprove} onClick={() => onApprove(request)}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Onayla
          </Button>
          <Button variant="outline" disabled={isPending || !request.canReject} onClick={() => onReject(request)}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reddet
          </Button>
          {!request.canApprove ? (
            <Badge variant="secondary">Bu istek icin karar yetkiniz yok veya self-approve bloklu</Badge>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function AdminApprovalQueue({ data }: AdminApprovalQueueProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function submitDecision(request: AdminApprovalRequestSummary, decision: "approve" | "reject") {
    if ((decision === "approve" && !request.canApprove) || (decision === "reject" && !request.canReject)) {
      return
    }

    const promptMessage =
      decision === "approve"
        ? "Onay notu eklemek isterseniz yazin. Bos birakabilirsiniz."
        : "Reddetme nedeni en az 3 karakter olmalidir."
    const input = window.prompt(promptMessage)

    if (input === null) {
      return
    }

    const reason = input.trim()
    if (decision === "reject" && reason.length < 3) {
      toast({
        title: "Reddetme notu gerekli",
        description: "Lutfen en az 3 karakterlik bir neden girin.",
        variant: "warning",
      })
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/admin/approvals/${request.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decision,
          ...(reason ? { reason } : {}),
        }),
      })

      const result = (await response.json()) as DecisionResponse
      if (!response.ok) {
        toast({
          title: "Karar kaydedilemedi",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: decision === "approve" ? "Onay uygulandi" : "Istek reddedildi",
        description: result.message ?? "Onay kuyrugu guncellendi.",
        variant: "success",
      })

      router.refresh()
    })
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <Card className="rounded-[24px] border-border/70 bg-card/90">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-primary" />
            <CardTitle>Bekleyen istekler</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Bekleyen approval istegi yok.
            </div>
          ) : (
            data.pending.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isPending={isPending}
                onApprove={(item) => submitDecision(item, "approve")}
                onReject={(item) => submitDecision(item, "reject")}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-border/70 bg-card/90">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCheck className="h-5 w-5 text-emerald-500" />
            <CardTitle>Sonuclanan istekler</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
              Yakinda sonuclanmis approval kaydi yok.
            </div>
          ) : (
            data.recent.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isPending={isPending}
                onApprove={(item) => submitDecision(item, "approve")}
                onReject={(item) => submitDecision(item, "reject")}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
