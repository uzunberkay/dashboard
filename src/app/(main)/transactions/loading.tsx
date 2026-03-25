export default function TransactionsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-[28px] border border-white/[0.08] bg-card/70 p-6">
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-72 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-[22px] bg-background/80" />
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/[0.08] bg-card/70 p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-white/[0.08] bg-card/70 p-5">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-[22px] bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  )
}
