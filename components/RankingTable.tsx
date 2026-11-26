import Link from 'next/link';
import { displayName } from '@/lib/names';
import type { PlayerKey, Standing } from '@/lib/types';

export function RankingTable({
  standings,
  names,
  profileHref,
}: {
  standings: Standing[];
  names: Record<PlayerKey, string>;
  profileHref?: (player: PlayerKey) => string | null;
}) {
  if (standings.length === 0) return <p className="text-sm text-stone-500">Noch keine Partien gespielt.</p>;
  return (
    <table className="w-full text-left">
      <thead className="text-xs uppercase text-stone-500">
        <tr>
          <th className="w-8 py-1">#</th>
          <th className="py-1">Name</th>
          <th className="py-1 text-right">Siege</th>
          <th className="py-1 text-right">Quote</th>
          <th className="py-1 text-right">Partien</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const href = profileHref?.(s.player);
          const name = displayName(names, s.player);
          return (
            <tr key={s.player} className="border-t border-stone-100">
              <td className="py-2 font-semibold text-stone-500">{i < 3 && s.played > 0 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
              <td className="max-w-0 truncate py-2 font-medium">
                {href ? (
                  <Link href={href} className="hover:underline">
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </td>
              <td className="py-2 text-right font-bold">{s.wins}</td>
              <td className="py-2 text-right text-stone-600">{Math.round(s.winRate * 100)} %</td>
              <td className="py-2 text-right text-stone-600">{s.played}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
