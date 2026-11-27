import Link from 'next/link';
import type { PlayerKey } from '@/lib/types';
import { PlayerBadge } from './PlayerBadge';

export interface Pairing {
  a: string;
  b: string;
  aKey?: PlayerKey;
  bKey?: PlayerKey;
  label?: string; // z. B. „Verliererrunde 2“
}

/** „Jetzt am Tisch“ und „Danach“ – die Spielreihenfolge im Turnier. */
export function NowPlaying({ now, next, pausedCount, href }: { now: Pairing | null; next: Pairing | null; pausedCount: number; href?: string }) {
  if (!now && !next && pausedCount === 0) return null;
  const side = (name: string, key?: PlayerKey) => (
    <span className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
      {key && <PlayerBadge player={key} name={name} size="md" />}
      <span className="font-cond line-clamp-2 text-xl leading-tight font-extrabold uppercase">{name}</span>
    </span>
  );
  const body = (
    <section className="shadow-card overflow-hidden rounded-xl border-2 border-accent bg-surface">
      <div className="flex items-center justify-between bg-accent px-4 py-1.5 text-[11px] font-black tracking-widest text-white uppercase">
        <span>Jetzt am Tisch</span>
        {now?.label && <span className="opacity-90">{now.label}</span>}
      </div>
      {now ? (
        <div className="flex items-center gap-2 px-3 py-4">
          {side(now.a, now.aKey)}
          <span className="font-cond shrink-0 text-lg font-extrabold text-muted">VS</span>
          {side(now.b, now.bKey)}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted">Gerade ist keine Partie spielbar{pausedCount ? ' – es wird auf pausierte Spieler gewartet.' : '.'}</p>
      )}
      {(next || pausedCount > 0) && (
        <div className="space-y-0.5 border-t border-line px-4 py-2 text-sm">
          {next && (
            <div className="truncate">
              <span className="font-bold text-muted">Danach: </span>
              <span className="font-semibold">
                {next.a} – {next.b}
              </span>
              {next.label && <span className="text-muted"> · {next.label}</span>}
            </div>
          )}
          {pausedCount > 0 && (
            <div className="text-xs text-muted">
              ⏸ {pausedCount} {pausedCount === 1 ? 'Partie wartet' : 'Partien warten'} auf pausierte Spieler
            </div>
          )}
        </div>
      )}
    </section>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
