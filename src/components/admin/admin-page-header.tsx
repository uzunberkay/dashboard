import type { ReactNode } from "react"

interface AdminPageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 rounded-[28px] border border-white/[0.12] bg-card/70 backdrop-blur-xl dark:border-white/[0.06] p-6 shadow-sm backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">{eyebrow}</p>
        )}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
