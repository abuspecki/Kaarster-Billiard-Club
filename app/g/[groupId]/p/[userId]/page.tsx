import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui';
import { loadGroup, loadGroupMatches, loadNames } from '@/lib/data';
import { computeStandings, headToHead } from '@/lib/stats';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-stone-500">{label}</div>
    </div>
  );
}

export default async function ProfilePage({ params }: { params: Promise<{ groupId: string; userId: string }> }) {
  const { groupId, userId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const group = await loadGroup(sb, groupId, user.id);
  if (!group) notFound();
  const [matches, names] = await Promise.all([loadGroupMatches(sb, groupId), loadNames(sb, groupId)]);
  const key = `u:${userId}`;
  if (!names[key]) notFound();

  const s = computeStandings(matches).find((x) => x.player === key);
  const duels = Object.keys(names)
    .filter((k) => k !== key)
    .map((k) => ({ k, ...headToHead(matches, key, k) }))
    .filter((d) => d.aWins + d.bWins > 0)
    .sort((a, b) => b.aWins + b.bWins - (a.aWins + a.bWins));

  return (
    <div className="space-y-4">
      <Link href={`/g/${groupId}`} className="text-sm font-semibold text-emerald-700">
        ‹ {group.name}
      </Link>
      <h1 className="text-2xl font-bold">{names[key]}</h1>

      <Card>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Siege" value={s?.wins ?? 0} />
          <Stat label="Niederlagen" value={s?.losses ?? 0} />
          <Stat label="Siegquote" value={`${Math.round((s?.winRate ?? 0) * 100)} %`} />
          <Stat label="Partien" value={s?.played ?? 0} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-600">
          <div>
            Einzel: <b>{s?.singlesWins ?? 0}</b> : {s?.singlesLosses ?? 0}
          </div>
          <div>
            Team: <b>{s?.teamWins ?? 0}</b> : {s?.teamLosses ?? 0}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Direkter Vergleich</h2>
        {duels.length === 0 ? (
          <p className="text-sm text-stone-500">Noch keine Duelle.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {duels.map((d) => (
              <li key={d.k} className="flex justify-between py-2">
                <span>Gegen {names[d.k]}</span>
                <span className="font-mono font-bold">
                  <span className={d.aWins >= d.bWins ? 'text-emerald-700' : ''}>{d.aWins}</span> :{' '}
                  <span className={d.bWins > d.aWins ? 'text-red-700' : ''}>{d.bWins}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
