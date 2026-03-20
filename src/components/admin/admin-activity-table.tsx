"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { formatAdminActivityEvent } from "@/lib/admin/labels"
import { formatDateTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminActivityExplorerItem } from "@/types/admin"

interface AdminActivityTableProps {
  items: AdminActivityExplorerItem[]
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "Ek metadata yok."
  }

  return JSON.stringify(metadata, null, 2)
}

export function AdminActivityTable({ items }: AdminActivityTableProps) {
  const [selectedItem, setSelectedItem] = useState<AdminActivityExplorerItem | null>(null)

  if (items.length === 0) {
    return (
      <div className="rounded-[26px] border border-dashed border-border/70 bg-card/70 px-6 py-12 text-center text-sm text-muted-foreground">
        Secili filtrelerde aktivite kaydi bulunamadi.
      </div>
    )
  }

  return (
    <>
      <div className="rounded-[26px] border border-border/70 bg-card/85 p-4 shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Olay</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Zaman</TableHead>
              <TableHead className="text-right">Detay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant="secondary">{formatAdminActivityEvent(item.event)}</Badge>
                    <p className="max-w-[280px] text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="font-medium">{item.actorName}</p>
                  <p className="text-xs text-muted-foreground">{item.actorEmail ?? "Sistem"}</p>
                </TableCell>
                <TableCell className="text-sm">
                  <p className="font-medium">{item.targetName}</p>
                  <p className="text-xs text-muted-foreground">{item.targetEmail ?? "-"}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{item.ipAddress ?? "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(item.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelectedItem(item)}>
                    <Eye className="h-4 w-4" />
                    Incele
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent>
          {selectedItem ? (
            <>
              <SheetHeader>
                <SheetTitle>{formatAdminActivityEvent(selectedItem.event)}</SheetTitle>
                <SheetDescription>{selectedItem.description}</SheetDescription>
              </SheetHeader>

              <div className="grid gap-4">
                <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Actor</p>
                  <p className="mt-2 font-medium">{selectedItem.actorName}</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.actorEmail ?? "Sistem"}</p>
                </div>

                <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Target</p>
                  <p className="mt-2 font-medium">{selectedItem.targetName}</p>
                  <p className="text-sm text-muted-foreground">{selectedItem.targetEmail ?? "-"}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">IP adresi</p>
                    <p className="mt-2 text-sm font-medium">{selectedItem.ipAddress ?? "-"}</p>
                  </div>
                  <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">User agent</p>
                    <p className="mt-2 text-sm font-medium">{selectedItem.userAgent ?? "-"}</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ham metadata</p>
                  <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950/95 p-3 text-xs text-slate-100">
                    {formatMetadata(selectedItem.metadata)}
                  </pre>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
