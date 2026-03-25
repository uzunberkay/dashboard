"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BellRing,
  CalendarClock,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import type {
  MonthlyReport,
  NotificationPreference,
  RecurringRule,
  ScheduledPayment,
  TransactionType,
} from "@/types"

type CategoryOption = {
  id: string
  name: string
  parentId: string | null
}

type RuleDraft = {
  name: string
  type: TransactionType
  amount: string
  description: string
  frequency: "WEEKLY" | "MONTHLY" | "CUSTOM_MONTH_DAY"
  customMonthDay: string
  startsAt: string
  endsAt: string
  isActive: boolean
  isSubscription: boolean
  reminderDaysBefore: string
  categoryId: string
}

type PaymentDraft = {
  name: string
  type: TransactionType
  amount: string
  description: string
  dueDate: string
  categoryId: string
}

function toDateInput(value?: string | null) {
  if (!value) {
    return ""
  }

  return new Date(value).toISOString().slice(0, 10)
}

function createRuleDraft(rule?: RecurringRule | null): RuleDraft {
  return {
    name: rule?.name ?? "",
    type: rule?.type ?? "EXPENSE",
    amount: rule ? String(rule.amount) : "",
    description: rule?.description ?? "",
    frequency: rule?.frequency ?? "MONTHLY",
    customMonthDay: rule?.customMonthDay ? String(rule.customMonthDay) : "",
    startsAt: toDateInput(rule?.startsAt) || toDateInput(new Date().toISOString()),
    endsAt: toDateInput(rule?.endsAt),
    isActive: rule?.isActive ?? true,
    isSubscription: rule?.isSubscription ?? false,
    reminderDaysBefore: String(rule?.reminderDaysBefore ?? 3),
    categoryId: rule?.categoryId ?? "none",
  }
}

function createPaymentDraft(paymentDate?: string): PaymentDraft {
  return {
    name: "",
    type: "EXPENSE",
    amount: "",
    description: "",
    dueDate: paymentDate ?? toDateInput(new Date().toISOString()),
    categoryId: "none",
  }
}

export function PlanningSections({
  recurringRules,
  scheduledPayments,
  notificationPreference,
  monthlyReports,
  categories,
  focus,
  onRefresh,
}: {
  recurringRules: RecurringRule[]
  scheduledPayments: ScheduledPayment[]
  notificationPreference: NotificationPreference | null
  monthlyReports: MonthlyReport[]
  categories: CategoryOption[]
  focus: string | null
  onRefresh: () => Promise<void> | void
}) {
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<RecurringRule | null>(null)
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(() => createRuleDraft())
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(() => createPaymentDraft())
  const [preferenceDraft, setPreferenceDraft] = useState<NotificationPreference>({
    emailReminders: notificationPreference?.emailReminders ?? true,
    emailMonthlyDigest: notificationPreference?.emailMonthlyDigest ?? true,
    reminderLeadDays: notificationPreference?.reminderLeadDays ?? 3,
  })
  const [busyKey, setBusyKey] = useState<string | null>(null)

  useEffect(() => {
    setPreferenceDraft({
      emailReminders: notificationPreference?.emailReminders ?? true,
      emailMonthlyDigest: notificationPreference?.emailMonthlyDigest ?? true,
      reminderLeadDays: notificationPreference?.reminderLeadDays ?? 3,
    })
  }, [notificationPreference])

  const upcomingPayments = useMemo(
    () => scheduledPayments.filter((payment) => payment.status === "PENDING").slice(0, 6),
    [scheduledPayments]
  )

  const subscriptionCount = recurringRules.filter((rule) => rule.isSubscription).length

  async function refreshWithToast(title: string) {
    await onRefresh()
    toast({ title, variant: "success" })
  }

  async function saveRule() {
    setBusyKey("save-rule")
    try {
      const response = await fetch(
        editingRule ? `/api/recurring-rules/${editingRule.id}` : "/api/recurring-rules",
        {
          method: editingRule ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...ruleDraft,
            amount: Number(ruleDraft.amount),
            customMonthDay:
              ruleDraft.frequency === "CUSTOM_MONTH_DAY" && ruleDraft.customMonthDay
                ? Number(ruleDraft.customMonthDay)
                : null,
            categoryId: ruleDraft.categoryId === "none" ? null : ruleDraft.categoryId,
            reminderDaysBefore: Number(ruleDraft.reminderDaysBefore),
            endsAt: ruleDraft.endsAt || null,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Recurring kural kaydedilemedi.")
      }

      setRuleDialogOpen(false)
      setEditingRule(null)
      setRuleDraft(createRuleDraft())
      await refreshWithToast(editingRule ? "Recurring kural guncellendi" : "Recurring kural eklendi")
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Islem tamamlanamadi.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
    }
  }

  async function deleteRule(rule: RecurringRule) {
    if (!confirm(`"${rule.name}" kuralini silmek istediginize emin misiniz?`)) {
      return
    }

    setBusyKey(`delete-rule-${rule.id}`)
    try {
      const response = await fetch(`/api/recurring-rules/${rule.id}`, { method: "DELETE" })
      if (!response.ok) {
        throw new Error("Recurring kural silinemedi.")
      }

      await refreshWithToast("Recurring kural silindi")
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Islem tamamlanamadi.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
    }
  }

  async function saveManualPayment() {
    setBusyKey("save-payment")
    try {
      const response = await fetch("/api/scheduled-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...paymentDraft,
          amount: Number(paymentDraft.amount),
          dueDate: new Date(paymentDraft.dueDate).toISOString(),
          categoryId: paymentDraft.categoryId === "none" ? null : paymentDraft.categoryId,
          source: "MANUAL",
        }),
      })

      if (!response.ok) {
        throw new Error("Planli odeme kaydedilemedi.")
      }

      setPaymentDialogOpen(false)
      setPaymentDraft(createPaymentDraft())
      await refreshWithToast("Planli odeme eklendi")
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Islem tamamlanamadi.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
    }
  }

  async function updatePaymentStatus(payment: ScheduledPayment, status: "PAID" | "SKIPPED") {
    setBusyKey(`${status}-${payment.id}`)
    try {
      const response = await fetch(`/api/scheduled-payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          createTransaction: status === "PAID",
        }),
      })

      if (!response.ok) {
        throw new Error("Planli odeme guncellenemedi.")
      }

      await refreshWithToast(status === "PAID" ? "Odeme isaretlendi" : "Odeme atlandi")
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Islem tamamlanamadi.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
    }
  }

  async function savePreferences() {
    setBusyKey("save-preferences")
    try {
      const response = await fetch("/api/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferenceDraft),
      })

      if (!response.ok) {
        throw new Error("Bildirim tercihleri kaydedilemedi.")
      }

      await refreshWithToast("Bildirim tercihleri guncellendi")
    } catch (error) {
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Islem tamamlanamadi.",
        variant: "destructive",
      })
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card
        id="recurring-rules"
        className={cn(
          "rounded-[24px] ",
          focus === "recurring-rules" && "ring-2 ring-primary/30"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3 p-5">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Recurring kurallar</CardTitle>
            <p className="text-xs text-muted-foreground">
              Tekrarlayan gelir, abonelik ve giderleri burada planlayin.
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingRule(null)
              setRuleDraft(createRuleDraft())
              setRuleDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            Kural ekle
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Toplam kural</p>
              <p className="mt-1 text-lg font-semibold">{recurringRules.length}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Aktif kural</p>
              <p className="mt-1 text-lg font-semibold">
                {recurringRules.filter((rule) => rule.isActive).length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Abonelik</p>
              <p className="mt-1 text-lg font-semibold">{subscriptionCount}</p>
            </div>
          </div>
          {recurringRules.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
              Henuz recurring kural eklenmedi.
            </div>
          ) : (
            recurringRules.map((rule) => (
              <div
                key={rule.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <Badge variant={rule.isActive ? "success" : "secondary"}>
                      {rule.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                    {rule.isSubscription ? <Badge variant="outline">Abonelik</Badge> : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(rule.amount)} / {rule.frequency} / {rule.category?.name ?? "Kategori yok"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingRule(rule)
                      setRuleDraft(createRuleDraft(rule))
                      setRuleDialogOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Duzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void deleteRule(rule)}
                    disabled={busyKey === `delete-rule-${rule.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                    Sil
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card
        id="scheduled-payments"
        className={cn(
          "rounded-[24px] ",
          focus === "scheduled-payments" && "ring-2 ring-primary/30"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-3 p-5">
          <div className="space-y-1">
            <CardTitle className="text-base font-semibold">Planli odemeler</CardTitle>
            <p className="text-xs text-muted-foreground">
              Yaklasan odemeleri izleyin, manuel kayit ekleyin ve &quot;odendi&quot; olarak isaretleyin.
            </p>
          </div>
          <Button onClick={() => setPaymentDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Planli odeme ekle
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 p-5 pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Bekleyen</p>
              <p className="mt-1 text-lg font-semibold">{upcomingPayments.length}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Odendi</p>
              <p className="mt-1 text-lg font-semibold">
                {scheduledPayments.filter((payment) => payment.status === "PAID").length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <p className="text-xs text-muted-foreground">Atlandi</p>
              <p className="mt-1 text-lg font-semibold">
                {scheduledPayments.filter((payment) => payment.status === "SKIPPED").length}
              </p>
            </div>
          </div>

          {scheduledPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
              Henuz planli odeme yok.
            </div>
          ) : (
            scheduledPayments.slice(0, 8).map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{payment.name}</p>
                    <Badge
                      variant={
                        payment.status === "PAID"
                          ? "success"
                          : payment.status === "SKIPPED"
                            ? "secondary"
                            : "warning"
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(payment.amount)} / {formatDate(payment.dueDate)} / {payment.category?.name ?? "Kategori yok"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {payment.status === "PENDING" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => void updatePaymentStatus(payment, "PAID")}
                        disabled={busyKey === `PAID-${payment.id}`}
                      >
                        Odendi
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void updatePaymentStatus(payment, "SKIPPED")}
                        disabled={busyKey === `SKIPPED-${payment.id}`}
                      >
                        Atla
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card
          id="notifications"
          className={cn(
            "rounded-[24px] ",
            focus === "notifications" && "ring-2 ring-primary/30"
          )}
        >
          <CardHeader className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Bildirim tercihleri</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Email reminder ve aylik digest davranisini buradan yonetin.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <span className="text-sm font-medium">Email reminder acik</span>
              <input
                type="checkbox"
                checked={preferenceDraft.emailReminders}
                onChange={(event) =>
                  setPreferenceDraft((current) => ({
                    ...current,
                    emailReminders: event.target.checked,
                  }))
                }
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-3">
              <span className="text-sm font-medium">Aylik digest email acik</span>
              <input
                type="checkbox"
                checked={preferenceDraft.emailMonthlyDigest}
                onChange={(event) =>
                  setPreferenceDraft((current) => ({
                    ...current,
                    emailMonthlyDigest: event.target.checked,
                  }))
                }
              />
            </label>
            <label className="space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Hatirlatma kac gun once gelsin
              </span>
              <Input
                type="number"
                min={0}
                max={30}
                value={preferenceDraft.reminderLeadDays}
                onChange={(event) =>
                  setPreferenceDraft((current) => ({
                    ...current,
                    reminderLeadDays: Number(event.target.value) || 0,
                  }))
                }
              />
            </label>
            <Button onClick={() => void savePreferences()} disabled={busyKey === "save-preferences"}>
              <Save className="h-4 w-4" />
              Tercihleri kaydet
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] ">
          <CardHeader className="space-y-1 p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Aylik rapor arsivi</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Dashboard digest ve email raporlarinin uygulama ici arsivi.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {monthlyReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-5 text-center text-sm text-muted-foreground">
                Henuz aylik rapor olusmadi.
              </div>
            ) : (
              monthlyReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{report.title}</p>
                    <Badge variant={report.emailSentAt ? "success" : "secondary"}>
                      {report.emailSentAt ? "Email gonderildi" : "Sadece uygulama ici"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.summaryText}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Donem: {report.year}-{String(report.month).padStart(2, "0")} / Olusturulma {formatDate(report.createdAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Recurring kural duzenle" : "Recurring kural ekle"}</DialogTitle>
            <DialogDescription>
              Tekrarlayan gelir ve giderler dashboard takvimi ile reminder akisina dahil edilir.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Kural adi"
              value={ruleDraft.name}
              onChange={(event) => setRuleDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Tutar"
              value={ruleDraft.amount}
              onChange={(event) => setRuleDraft((current) => ({ ...current, amount: event.target.value }))}
            />
            <Select
              value={ruleDraft.type}
              onValueChange={(value) =>
                setRuleDraft((current) => ({ ...current, type: value as TransactionType }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Gider</SelectItem>
                <SelectItem value="INCOME">Gelir</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={ruleDraft.frequency}
              onValueChange={(value) =>
                setRuleDraft((current) => ({ ...current, frequency: value as RuleDraft["frequency"] }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="WEEKLY">WEEKLY</SelectItem>
                <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                <SelectItem value="CUSTOM_MONTH_DAY">CUSTOM_MONTH_DAY</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={ruleDraft.startsAt}
              onChange={(event) => setRuleDraft((current) => ({ ...current, startsAt: event.target.value }))}
            />
            <Input
              type="date"
              value={ruleDraft.endsAt}
              onChange={(event) => setRuleDraft((current) => ({ ...current, endsAt: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Custom month day"
              value={ruleDraft.customMonthDay}
              onChange={(event) => setRuleDraft((current) => ({ ...current, customMonthDay: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Reminder gun"
              value={ruleDraft.reminderDaysBefore}
              onChange={(event) => setRuleDraft((current) => ({ ...current, reminderDaysBefore: event.target.value }))}
            />
            <Select
              value={ruleDraft.categoryId}
              onValueChange={(value) => setRuleDraft((current) => ({ ...current, categoryId: value }))}
            >
              <SelectTrigger className="md:col-span-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kategori secilmedi</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              className="min-h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm md:col-span-2"
              placeholder="Aciklama"
              value={ruleDraft.description}
              onChange={(event) => setRuleDraft((current) => ({ ...current, description: event.target.value }))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ruleDraft.isActive}
                onChange={(event) => setRuleDraft((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Aktif
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ruleDraft.isSubscription}
                onChange={(event) => setRuleDraft((current) => ({ ...current, isSubscription: event.target.checked }))}
              />
              Abonelik olarak isaretle
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Vazgec</Button>
            <Button onClick={() => void saveRule()} disabled={busyKey === "save-rule"}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Planli odeme ekle</DialogTitle>
            <DialogDescription>
              Manuel planli odeme ekleyerek nakit akisi takvimine yeni kayit dusun.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Input
              placeholder="Odeme adi"
              value={paymentDraft.name}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Tutar"
              value={paymentDraft.amount}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))}
            />
            <Select
              value={paymentDraft.type}
              onValueChange={(value) =>
                setPaymentDraft((current) => ({ ...current, type: value as TransactionType }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EXPENSE">Gider</SelectItem>
                <SelectItem value="INCOME">Gelir</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={paymentDraft.dueDate}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, dueDate: event.target.value }))}
            />
            <Select
              value={paymentDraft.categoryId}
              onValueChange={(value) => setPaymentDraft((current) => ({ ...current, categoryId: value }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kategori secilmedi</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <textarea
              className="min-h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm"
              placeholder="Aciklama"
              value={paymentDraft.description}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Vazgec</Button>
            <Button onClick={() => void saveManualPayment()} disabled={busyKey === "save-payment"}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
