import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { AuthShell, authHighlights } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const callbackUrl = getSingleValue(resolvedSearchParams.callbackUrl)

  return (
    <AuthShell
      title="Admin kontrol merkezine giris yap"
      description="Sadece yetkili yoneticiler icin ayrilmis kullanici, sistem ve operasyon paneline guvenli sekilde giris yapin."
      highlights={authHighlights}
      footer={(
        <p>
          Standart kullanici girisi mi gerekiyor?{" "}
          <Link href="/login" prefetch className="font-semibold text-slate-950 transition hover:text-primary">
            Normal girise don
          </Link>
        </p>
      )}
    >
      <div className="mb-6 rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-3.5 text-sm text-slate-600">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <p className="font-semibold text-slate-950">Sadece admin erisimi</p>
            <p>Bu ekran sadece yonetici yetkisine sahip hesaplar icindir. Giris sonrasi dogrudan /admin alanina gecilir.</p>
          </div>
        </div>
      </div>

      <LoginForm
        adminOnly
        callbackUrl={callbackUrl}
        submitLabel="Admin olarak gir"
        helperText="Basarili giriste dashboard, kullanici yonetimi ve sistem paneli acilir."
      />
    </AuthShell>
  )
}
