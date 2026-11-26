import type { ReactNode } from 'react';

/** Eine Partie als Ergebniszeile: Sieger 1 : 0 Verlierer. */
export function ResultCard({
  winner,
  loser,
  meta,
  tag,
  onClick,
  trailing,
}: {
  winner: ReactNode;
  loser: ReactNode;
  meta: string;
  tag?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const body = (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2 font-bold">{winner}</div>
        <div className="font-cond rounded-md bg-surface-2 px-2 py-0.5 text-xl font-extrabold tabular-nums">
          1<span className="mx-1 text-muted">:</span>
          <span className="text-muted">0</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2 text-muted">{loser}</div>
      </div>
      <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] text-muted">
        {tag && <span className="rounded bg-accent-soft px-1.5 py-px font-bold text-accent-text">{tag}</span>}
        <span className="truncate">{meta}</span>
        {trailing}
      </div>
    </>
  );
  return onClick ? (
    <button onClick={onClick} className="block w-full px-4 py-3 text-left transition hover:bg-surface-2">
      {body}
    </button>
  ) : (
    <div className="px-4 py-3">{body}</div>
  );
}
