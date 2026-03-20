import Link from "next/link"
import { AuthShell, authHighlights } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/login-form"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await searchParams
  const callbackUrl = getSingleValue(resolvedSearchParams.callbackUrl)

  return (
    <AuthShell
      title="Tekrar hos geldiniz"
      description="Butce gorunumune kaldiginiz yerden devam etmek icin hesabiniza hizli ve guvenli sekilde giris yapin."
      highlights={authHighlights}
      footer={(
        <p>
          Hesabiniz yok mu?{" "}
          <Link href="/register" prefetch className="font-semibold text-slate-950 transition hover:text-primary">
            Kayit ol
          </Link>
          {" • "}
          <Link href="/admin/login" prefetch className="font-semibold text-slate-950 transition hover:text-primary">
            Admin girisi
          </Link>
        </p>
      )}
    >
      <LoginForm
        callbackUrl={callbackUrl}
        helperText="Birkac saniyede oturumu acip finans panelinize geri donebilirsiniz."
      />
    </AuthShell>
  )
}
