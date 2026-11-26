import Link from 'next/link';
import { displayName } from '@/lib/names';
import type { PlayerKey, Standing } from '@/lib/types';
import { FormDots } from './FormDots';
import { PlayerBadge } from './PlayerBadge';

/** Rangliste im Stil einer Ligatabelle. */
export function LeagueTable({
  standings,
  names,
  forms,
  profileHref,
  limit,
}: {
  standings: Standing[];
  names: Record<PlayerKey, string>;
  forms?: Record<PlayerKey, ('W' | 'L')[]>;
  profileHref?: (p: PlayerKey) => string | null;
  limit?: number;
}) {
  const rows = limit ? standings.slice(0, limit) : standings;
  return (
    <table className="w-full table-fixed text-[13px]">
      <thead>
        <tr className="text-[10px] font-bold tracking-wide text-muted uppercase">
          <th className="w-9 py-1.5 pl-4 text-left">#</th>
          <th className="py-1.5 text-left">Spieler</th>
          <th className="w-8 py-1.5 text-right">S</th>
          <th className="w-8 py-1.5 text-right">N</th>
          <th className="w-11 py-1.5 pr-2 text-right">%</th>
          {forms && <th className="w-[82px] py-1.5 pr-4 text-right">Form</th>}
          {!forms && <th className="w-4" />}
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => {
          const name = displayName(names, s.player);
          const href = profileHref?.(s.player);
          const leader = i === 0 && s.played > 0;
          const nameCell = (
            <span className="flex min-w-0 items-center gap-2">
              <PlayerBadge player={s.player} name={name} size="sm" />
              <span className="truncate font-semibold">{name}</span>
            </span>
          );
          return (
            <tr key={s.player} className={`border-t border-line ${leader ? 'bg-accent-soft' : ''}`}>
              <td className="py-2.5 pl-4 font-bold text-muted">{s.played > 0 ? i + 1 : '–'}</td>
              <td className="py-2.5">{href ? <Link href={href}>{nameCell}</Link> : nameCell}</td>
              <td className="py-2.5 text-right font-extrabold">{s.wins}</td>
              <td className="py-2.5 text-right text-muted">{s.losses}</td>
              <td className="py-2.5 pr-2 text-right text-muted">{s.played ? Math.round(s.winRate * 100) : '–'}</td>
              {forms ? (
                <td className="py-2.5 pr-4 text-right">
                  <FormDots form={forms[s.player] ?? []} />
                </td>
              ) : (
                <td />
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
