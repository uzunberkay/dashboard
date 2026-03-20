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
        "relative overflow-hidden rounded-[28px] border border-border/70 bg-card/90 p-6 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_36%)]" />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                {eyebrow}
              </p>
            ) : null}
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
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
                className="rounded-[22px] border border-border/70 bg-background/60 p-4 shadow-sm backdrop-blur-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className={cn("mt-2 text-2xl font-semibold tracking-tight", toneClasses[stat.tone ?? "default"])}>
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
