"use client"

import { useState } from "react"
import { getSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight } from "lucide-react"
import { hasAdminAccess } from "@/lib/admin/permissions"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface LoginFormProps {
  adminOnly?: boolean
  callbackUrl?: string
  helperText: string
  submitLabel?: string
}

function normalizeCallbackUrl(callbackUrl: string | undefined, fallback: string) {
  if (!callbackUrl || !callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback
  }

  return callbackUrl
}

export function LoginForm({
  adminOnly = false,
  callbackUrl,
  helperText,
  submitLabel = "Devam et",
}: LoginFormProps) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fallbackPath = adminOnly ? "/admin" : "/"
    const nextPath = normalizeCallbackUrl(callbackUrl, fallbackPath)
    let isSuccess = false

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: nextPath,
      })

      if (!result || result.error) {
        setError("E-posta veya sifre hatali.")
        return
      }

      const session = await getSession()
      const isAdminRoute = nextPath.startsWith("/admin")
      const isAdminUser = hasAdminAccess(session?.user?.role)

      if ((adminOnly || isAdminRoute) && !isAdminUser) {
        await signOut({ redirect: false })
        setError("Bu hesap admin paneline erisim yetkisine sahip degil.")
        return
      }

      isSuccess = true
      router.push(nextPath)
      router.refresh()
    } catch {
      setError("Giris sirasinda bir baglanti sorunu olustu. Lutfen tekrar deneyin.")
    } finally {
      if (!isSuccess) {
        setLoading(false)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3.5 text-sm text-red-700 shadow-[0_18px_35px_-28px_rgba(239,68,68,0.45)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="leading-6">{error}</span>
          </div>
        ) : null}

        <div className="space-y-2.5">
          <Label htmlFor="email" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            E-posta
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            placeholder="ornek@email.com"
            required
            className="h-14 rounded-2xl border-slate-200/80 bg-slate-50/75 px-4 text-[15px] text-slate-900 caret-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/8"
          />
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sifre
            </Label>
            <span className="text-xs font-medium text-slate-400">
              {adminOnly ? "Admin kontrolu" : "Sifrelenmis erisim"}
            </span>
          </div>
          <PasswordField
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Parolanizi girin"
            required
            disabled={loading}
            className="h-14 rounded-2xl border-slate-200/80 bg-slate-50/75 px-4 text-[15px] text-slate-900 caret-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/8"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={loading}
          className="h-14 w-full rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_28px_55px_-28px_rgba(15,23,42,0.7)] transition hover:bg-slate-900"
        >
          {loading ? (
            "Giris yapiliyor..."
          ) : (
            <>
              {submitLabel}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-center text-sm leading-6 text-slate-500">{helperText}</p>
      </div>
    </form>
  )
}
