import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowUpRight,
  BadgeCheck,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"

export type AuthHighlight = {
  icon: LucideIcon
  title: string
  description: string
}

interface AuthShellProps {
  title: string
  description: string
  highlights: AuthHighlight[]
  footer: ReactNode
  children: ReactNode
}

const featureChips = [
  "Kategori bazli analiz",
  "Canli butce ritmi",
  "Guvenli oturum",
]

const previewMetrics = [
  {
    label: "Aylik tasarruf ritmi",
    value: "+12.4%",
    detail: "Gecen aya gore daha dengeli.",
  },
  {
    label: "Odak kategoriler",
    value: "6 aktif alan",
    detail: "Butce dagilimi tek panelde okunur.",
  },
]

const previewBars = [
  { label: "Konut", value: "32%", width: "w-[82%]" },
  { label: "Market", value: "24%", width: "w-[68%]" },
  { label: "Ulasim", value: "18%", width: "w-[52%]" },
  { label: "Yeme icme", value: "14%", width: "w-[40%]" },
]

export const authHighlights: AuthHighlight[] = [
  {
    icon: Wallet,
    title: "Harcamalari tek yerden takip et",
    description: "Gunluk hareketleri sade ve hizli bir akista gor.",
  },
  {
    icon: LayoutDashboard,
    title: "Kategori bazli net gorunum",
    description: "Butcenin yogunlastigi alanlari dagilmadan oku.",
  },
  {
    icon: ShieldCheck,
    title: "Guvenli ve hizli erisim",
    description: "Giris deneyimini daha sakin ve kesintisiz yasayin.",
  },
]

export function AuthShell({
  title,
  description,
  highlights,
  footer,
  children,
}: AuthShellProps) {
  return (
    <div className="w-full max-w-7xl">
      <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/65 shadow-[0_40px_120px_-45px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,_rgba(255,255,255,0.52)_0%,_rgba(255,255,255,0.14)_100%)]" />
        <div className="relative grid lg:grid-cols-[1.14fr_0.86fr]">
          <section className="relative overflow-hidden border-b border-black/5 px-6 py-8 sm:px-8 sm:py-10 lg:min-h-[760px] lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.98),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(148,163,184,0.18),_transparent_34%),linear-gradient(160deg,_rgba(248,250,252,0.94)_0%,_rgba(244,242,237,0.88)_42%,_rgba(233,229,221,0.78)_100%)]" />
            <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(15,23,42,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.22)_1px,transparent_1px)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,white,transparent_92%)]" />

            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 pr-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.25)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white">
                    <Sparkles className="h-4.5 w-4.5" />
                  </span>
                  <span className="block text-left">
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
                      Butce alani
                    </span>
                    <span className="mt-1 block text-sm font-semibold text-slate-800">
                      Modern finans arayuzu
                    </span>
                  </span>
                </div>

                <div className="max-w-2xl space-y-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500">
                    Butce gorunurlugu
                  </p>
                  <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.6rem] lg:leading-[1.02]">
                    Harcama kontrolunu daha temiz, daha hizli ve daha modern bir yuzeyde yonetin.
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                    Finansal ritmi dagilmadan okumak, kategorileri hizla kavramak ve
                    oturum akisini daha guvenli hissetmek icin tasarlanmis sade bir calisma alani.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {featureChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)]"
                    >
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="overflow-hidden rounded-[32px] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_35px_70px_-28px_rgba(15,23,42,0.6)] sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-300">Canli finans ozeti</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.26em] text-slate-500">
                        Aylik kontrol panosu
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
                      Guncel bakis
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.92fr]">
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm text-slate-400">Bu ay kalan bakiye</p>
                        <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-[2.9rem]">
                          48.320 TL
                        </p>
                        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-sm font-medium text-emerald-300">
                          <TrendingUp className="h-4 w-4" />
                          Gecen aya gore +12.4%
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {previewMetrics.map((metric) => (
                          <div
                            key={metric.label}
                            className="rounded-[22px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                          >
                            <p className="text-sm text-slate-400">{metric.label}</p>
                            <p className="mt-2 text-xl font-semibold tracking-tight text-white">
                              {metric.value}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              {metric.detail}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-200">Kategori akisi</p>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                          Canli
                        </span>
                      </div>

                      <div className="mt-5 space-y-4">
                        {previewBars.map((item) => (
                          <div key={item.label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-300">{item.label}</span>
                              <span className="font-medium text-white">{item.value}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/10">
                              <div
                                className={`h-2 rounded-full bg-gradient-to-r from-white via-slate-300 to-slate-500 ${item.width}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {highlights.map((highlight) => {
                  const Icon = highlight.icon

                  return (
                    <div
                      key={highlight.title}
                      className="rounded-[26px] border border-white/70 bg-white/72 p-5 shadow-[0_22px_45px_-34px_rgba(15,23,42,0.45)]"
                    >
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-slate-950">{highlight.title}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {highlight.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="relative flex items-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
            <div className="mx-auto w-full max-w-md rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_34px_90px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  Guvenli erisim
                </div>
                <div className="rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white">
                  Ozel
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Hesap akisi
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {title}
                </h2>
                <p className="text-[15px] leading-7 text-slate-600">{description}</p>
              </div>

              <div className="mt-8 space-y-6">{children}</div>

              <div className="mt-8 border-t border-slate-200 pt-6">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Oturum bilgileriniz guvenli sekilde islenir.
                </div>
                <div className="text-sm leading-6 text-slate-600">{footer}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
