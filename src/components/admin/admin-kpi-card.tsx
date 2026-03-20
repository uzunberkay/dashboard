import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AdminKpiCardProps {
  label: string
  value: string
  hint: string
  icon: LucideIcon
  tone?: "default" | "success" | "warning"
}

const toneClasses = {
  default: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
}

export function AdminKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: AdminKpiCardProps) {
  return (
    <Card className="overflow-hidden rounded-[24px] border-border/70 bg-card/90">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <CardTitle className="text-3xl">{value}</CardTitle>
        </div>
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneClasses[tone])}>
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
