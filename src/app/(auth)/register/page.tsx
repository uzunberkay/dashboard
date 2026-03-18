"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowRight } from "lucide-react"
import { AuthShell, authHighlights } from "@/components/auth/auth-shell"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return

    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    let isSuccess = false

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let errorMessage = "Kayit sirasinda bir hata olustu."

        try {
          const data: unknown = await res.json()
          const responseError = (data as { error?: unknown })?.error
          if (typeof responseError === "string") {
            errorMessage = responseError
          }
        } catch {
          // JSON parse basarisizsa varsayilan mesaj kullanilir.
        }

        setError(errorMessage)
        return
      }

      isSuccess = true
      router.push("/login")
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setError("Kayit istegi zaman asimina ugradi. Lutfen tekrar deneyin.")
        return
      }

      setError("Baglanti sorunu olustu. Lutfen tekrar deneyin.")
    } finally {
      clearTimeout(timeoutId)
      if (!isSuccess) {
        setLoading(false)
      }
    }
  }

  return (
    <AuthShell
      title="Yeni hesabini olustur"
      description="Bir dakikadan kisa surede kaydolup ilk butce ritminizi modern bir panel uzerinden yonetmeye baslayin."
      highlights={authHighlights}
      footer={(
        <p>
          Zaten hesabiniz var mi?{" "}
          <Link href="/login" className="font-semibold text-slate-950 transition hover:text-primary">
            Giris yap
          </Link>
        </p>
      )}
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-5">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3.5 text-sm text-red-700 shadow-[0_18px_35px_-28px_rgba(239,68,68,0.45)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-6">{error}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <Label htmlFor="name" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Ad soyad
            </Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              autoFocus
              placeholder="Adinizi ve soyadinizi girin"
              required
              className="h-14 rounded-2xl border-slate-200/80 bg-slate-50/75 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/8"
            />
          </div>

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
              placeholder="ornek@email.com"
              required
              className="h-14 rounded-2xl border-slate-200/80 bg-slate-50/75 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/8"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password" className="text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Sifre
              </Label>
              <span className="text-xs font-medium text-slate-400">En az 6 karakter</span>
            </div>
            <PasswordField
              id="password"
              name="password"
              minLength={6}
              autoComplete="new-password"
              placeholder="Guclu bir parola belirleyin"
              required
              disabled={loading}
              className="h-14 rounded-2xl border-slate-200/80 bg-slate-50/75 px-4 text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-950/8"
            />
            <p className="text-xs leading-6 text-slate-500">
              Hesabiniz olustuktan sonra ilk butce kontrol paneliniz aninda hazir olur.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={loading}
            className="h-14 w-full rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_28px_55px_-28px_rgba(15,23,42,0.7)] transition hover:bg-slate-900"
          >
            {loading ? (
              "Hesap olusturuluyor..."
            ) : (
              <>
                Hesap olustur
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-sm leading-6 text-slate-500">
            Dakikalar icinde ilk kategori yapinizi ve butce ritminizi kurabilirsiniz.
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
