import { AlertTriangle, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { AdminAnomalyCard } from "@/types/admin"

interface AdminAnomalyPanelProps {
  items: AdminAnomalyCard[]
}

export function AdminAnomalyPanel({ items }: AdminAnomalyPanelProps) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/90">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Uyari ve anomali merkezi</CardTitle>
        <p className="text-sm text-muted-foreground">
          Dashboard metrikleri ile sistem policy esiklerinden uretildigi icin operasyonel okumayi hizlandirir.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {item.severity === "warning" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Info className="h-4 w-4 text-primary" />
                  )}
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Badge variant={item.severity === "warning" ? "warning" : "secondary"}>{item.value}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
