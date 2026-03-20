import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatAdminActivityEvent } from "@/lib/admin/labels"
import { formatDateTime, formatRelativeTime } from "@/lib/utils"
import type { AdminActivityItem } from "@/types/admin"

interface AdminActivityFeedProps {
  items: AdminActivityItem[]
}

function getEventTone(event: AdminActivityItem["event"]) {
  switch (event) {
    case "USER_STATUS_CHANGED":
    case "BULK_USER_UPDATED":
    case "ADMIN_SETTINGS_UPDATED":
      return "warning" as const
    case "LOGIN":
    case "ADMIN_EXPORT_CREATED":
      return "secondary" as const
    default:
      return "default" as const
  }
}

export function AdminActivityFeed({ items }: AdminActivityFeedProps) {
  return (
    <Card className="rounded-[24px] border-border/70 bg-card/90">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Son aktiviteler</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
            Henuz aktivite kaydi yok.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getEventTone(item.event)}>{formatAdminActivityEvent(item.event)}</Badge>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(item.createdAt)}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                    {item.ipAddress ? ` | ${item.ipAddress}` : ""}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
