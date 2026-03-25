"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AdminSettingDefinition, AdminSettingValueMap } from "@/types/admin"

interface AdminSettingsFormProps {
  definitions: AdminSettingDefinition[]
  values: AdminSettingValueMap
}

type FormState = Record<string, string>

function toFormState(values: AdminSettingValueMap): FormState {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value)])
  )
}

export function AdminSettingsForm({ definitions, values }: AdminSettingsFormProps) {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(() => toFormState(values))
  const [reason, setReason] = useState("")
  const [isPending, setIsPending] = useState(false)

  const dirtyKeys = useMemo(
    () =>
      Object.keys(form).filter((key) => form[key] !== String(values[key as keyof AdminSettingValueMap])),
    [form, values]
  )

  function updateValue(key: string, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  async function handleSubmit() {
    if (dirtyKeys.length === 0) {
      toast({
        title: "Degisiklik yok",
        description: "Kaydetmeden once en az bir ayar guncelleyin.",
        variant: "warning",
      })
      return
    }

    const payload = dirtyKeys.reduce<Record<string, number | string>>((accumulator, key) => {
      const definition = definitions.find((item) => item.key === key)
      if (!definition) {
        return accumulator
      }

      accumulator[key] = definition.inputType === "number" ? Number(form[key]) : form[key]
      return accumulator
    }, {})

    if (reason.trim().length < 3) {
      toast({
        title: "Onay notu gerekli",
        description: "Lutfen en az 3 karakterlik bir gerekce girin.",
        variant: "warning",
      })
      return
    }

    setIsPending(true)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          reason: reason.trim(),
        }),
      })

      const result = (await response.json()) as {
        error?: string
        mutation?: {
          mode?: "approval_requested" | "completed"
          message?: string
        }
      }
      if (!response.ok) {
        toast({
          title: "Ayarlar guncellenemedi",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title:
          result.mutation?.mode === "approval_requested"
            ? "Onay istegi olusturuldu"
            : "Ayarlar kaydedildi",
        description: result.mutation?.message ?? "Policy degerleri ve cache davranisi yenilendi.",
        variant: "success",
      })
      setReason("")
      router.refresh()
    } catch {
      toast({
        title: "Baglanti hatasi",
        description: "Ayarlar kaydedilirken bir sorun olustu.",
        variant: "destructive",
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-white/[0.12] bg-card/70 backdrop-blur-xl dark:border-white/[0.06] p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold">Duzenlenebilir admin policy ayarlari</p>
        <p className="text-sm text-muted-foreground">
          Sadece dusuk riskli, whitelist tabanli operasyon ayarlari panelden guncellenebilir.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {definitions.map((definition) => (
          <div key={definition.key} className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold">{definition.label}</p>
              <p className="text-sm text-muted-foreground">{definition.description}</p>
            </div>

            <div className="mt-4">
              {definition.inputType === "select" ? (
                <select
                  value={form[definition.key]}
                  onChange={(event) => updateValue(definition.key, event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {definition.options?.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="number"
                  min={definition.min}
                  max={definition.max}
                  step={definition.step ?? 1}
                  value={form[definition.key]}
                  onChange={(event) => updateValue(definition.key, event.target.value)}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4">
        <p className="text-sm font-semibold">Onay gerekcesi</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Kritik ayar degisiklikleri dogrudan uygulanmaz; ikinci admin onayi icin net bir not birakin.
        </p>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Degisikligin nedeni, beklenen etki ve gerekiyorsa geri donus plani"
          className="mt-4 min-h-[112px]"
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{dirtyKeys.length} alan degistirildi</p>
        <Button onClick={handleSubmit} disabled={isPending || reason.trim().length < 3}>
          {isPending ? "Gonderiliyor..." : "Onaya gonder"}
        </Button>
      </div>
    </div>
  )
}
