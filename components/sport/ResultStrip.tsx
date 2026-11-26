export interface StripItem {
  id: string;
  winner: string;
  loser: string;
  time: string;
  live: boolean;
}

/** Horizontale Ergebnisleiste wie in Sport-Apps. */
export function ResultStrip({ items }: { items: StripItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="no-scrollbar -mb-px flex gap-2 overflow-x-auto border-b border-line bg-surface px-4 py-3">
      {items.map((it) => (
        <div key={it.id} className="w-32 shrink-0 rounded-lg border border-line bg-surface-2 px-2.5 py-2 text-[13px]">
          <div className={`mb-1 flex items-center gap-1 text-[10px] font-extrabold tracking-wide ${it.live ? 'text-accent-text' : 'text-muted'}`}>
            {it.live && <span className="animate-live h-1.5 w-1.5 rounded-full bg-accent" />}
            {it.live ? 'HEUTE' : 'ENDSTAND'} · {it.time}
          </div>
          <div className="flex justify-between gap-1 font-bold">
            <span className="truncate">{it.winner}</span>
            <span>1</span>
          </div>
          <div className="flex justify-between gap-1 text-muted">
            <span className="truncate">{it.loser}</span>
            <span>0</span>
          </div>
        </div>
      ))}
    </div>
  );
}
