"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageHeroTone = "default" | "success" | "warning" | "danger"

interface PageHeroStat {
  label: string
  value: string
  helper?: string
  tone?: PageHeroTone
}

interface PageHeroProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
  stats?: PageHeroStat[]
  className?: string
}

const toneClasses: Record<PageHeroTone, string> = {
  default: "text-foreground",
  success: "text-income",
  warning: "text-warning",
  danger: "text-expense",
}

export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  stats,
  className,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/[0.12] bg-card/70 p-6 shadow-[var(--glass-shadow)] backdrop-blur-xl dark:border-white/[0.06]",
        className
      )}
    >
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-income/8 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>

        {stats?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={`${stat.label}-${stat.value}`}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 backdrop-blur-sm dark:border-white/[0.05]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className={cn("mt-2 text-2xl font-bold tracking-tight", toneClasses[stat.tone ?? "default"])}>
                  {stat.value}
                </p>
                {stat.helper ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{stat.helper}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
