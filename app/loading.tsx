/** Wird sofort beim Antippen eines Links gezeigt, bis die nächste Seite da ist. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Lädt …">
      <div className="bg-bar px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-white/15" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 animate-pulse rounded bg-white/15" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
          </div>
        </div>
      </div>
      <div className="h-0.5 overflow-hidden bg-line">
        <div className="animate-loadbar h-full w-1/3 bg-accent" />
      </div>
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-line bg-surface" />
        ))}
      </div>
    </div>
  );
}
