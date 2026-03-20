export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="h-40 animate-pulse rounded-[28px] border border-border/70 bg-card/70" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-[24px] border border-border/70 bg-card/70"
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="h-[380px] animate-pulse rounded-[24px] border border-border/70 bg-card/70" />
        <div className="h-[380px] animate-pulse rounded-[24px] border border-border/70 bg-card/70" />
      </div>
    </div>
  )
}
