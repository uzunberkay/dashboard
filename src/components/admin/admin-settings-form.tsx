"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

    setIsPending(true)

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast({
          title: "Ayarlar guncellenemedi",
          description: result.error ?? "Lutfen tekrar deneyin.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Ayarlar kaydedildi",
        description: "Policy degerleri ve cache davranisi yenilendi.",
        variant: "success",
      })
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
    <div className="rounded-[24px] border border-border/70 bg-card/90 p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-sm font-semibold">Duzenlenebilir admin policy ayarlari</p>
        <p className="text-sm text-muted-foreground">
          Sadece dusuk riskli, whitelist tabanli operasyon ayarlari panelden guncellenebilir.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {definitions.map((definition) => (
          <div key={definition.key} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
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

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{dirtyKeys.length} alan degistirildi</p>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Kaydediliyor..." : "Policy ayarlarini kaydet"}
        </Button>
      </div>
    </div>
  )
}
