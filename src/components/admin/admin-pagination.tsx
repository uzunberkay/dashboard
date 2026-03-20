import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AdminPaginationProps {
  pathname: string
  page: number
  totalPages: number
  searchParams: Record<string, string | undefined>
}

function buildHref(
  pathname: string,
  searchParams: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams()

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  params.set("page", String(page))
  return `${pathname}?${params.toString()}`
}

export function AdminPagination({
  pathname,
  page,
  totalPages,
  searchParams,
}: AdminPaginationProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-border/70 bg-card/85 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Sayfa <span className="font-semibold text-foreground">{page}</span> / {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={buildHref(pathname, searchParams, Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" />
            Onceki
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
          <Link href={buildHref(pathname, searchParams, Math.min(totalPages, page + 1))}>
            Sonraki
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
