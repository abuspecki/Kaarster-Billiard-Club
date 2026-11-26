import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppBar } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { FormDots } from '@/components/sport/FormDots';
import { PlayerBadge } from '@/components/sport/PlayerBadge';
import { SectionCard } from '@/components/sport/SectionCard';
import { StatTiles } from '@/components/sport/StatTiles';
import { loadGroup, loadGroupMatches, loadNames } from '@/lib/data';
import { computeStandings, headToHead, recentForm } from '@/lib/stats';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function ProfilePage({ params }: { params: Promise<{ groupId: string; userId: string }> }) {
  const { groupId, userId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const group = await loadGroup(sb, groupId, user.id);
  if (!group) notFound();
  const [matches, names] = await Promise.all([loadGroupMatches(sb, groupId), loadNames(sb, groupId)]);
  const key = `u:${userId}`;
  if (!names[key]) notFound();

  const standings = computeStandings(matches);
  const rank = standings.findIndex((x) => x.player === key);
  const s = standings[rank];
  const form = recentForm(matches, key, 10);
  const duels = Object.keys(names)
    .filter((k) => k !== key)
    .map((k) => ({ k, ...headToHead(matches, key, k) }))
    .filter((d) => d.aWins + d.bWins > 0)
    .sort((a, b) => b.aWins + b.bWins - (a.aWins + a.bWins));

  return (
    <>
      <AppBar title="Spielerprofil" subtitle={group.name} back={{ href: `/g/${groupId}?tab=spieler`, label: group.name }} />
      <div className="space-y-3 p-4">
        <section className="shadow-card overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center gap-4 p-4">
            <PlayerBadge player={key} name={names[key]} size="lg" />
            <div className="min-w-0">
              <h2 className="font-cond truncate text-3xl leading-tight font-extrabold uppercase">{names[key]}</h2>
              <p className="text-sm text-muted">{s ? `Platz ${rank + 1} in der Tabelle` : 'Noch keine Partie gespielt'}</p>
            </div>
          </div>
          <div className="px-4 pb-4">
            <StatTiles
              items={[
                { value: s?.wins ?? 0, label: 'Siege' },
                { value: s?.losses ?? 0, label: 'Niederl.' },
                { value: s ? `${Math.round(s.winRate * 100)}%` : '–', label: 'Quote' },
                { value: s?.played ?? 0, label: 'Partien' },
              ]}
            />
          </div>
        </section>

        {form.length > 0 && (
          <SectionCard title="Form · letzte Partien">
            <FormDots form={form} size="md" />
            <p className="mt-2 text-xs text-muted">Älteste links, neueste rechts.</p>
          </SectionCard>
        )}

        <SectionCard title="Einzel & Team">
          <StatTiles
            items={[
              { value: `${s?.singlesWins ?? 0}:${s?.singlesLosses ?? 0}`, label: 'Einzel' },
              { value: `${s?.teamWins ?? 0}:${s?.teamLosses ?? 0}`, label: 'Doppel/Team' },
            ]}
          />
        </SectionCard>

        <SectionCard title="Direkter Vergleich" flush>
          {duels.length === 0 ? (
            <EmptyState title="Noch keine Duelle" />
          ) : (
            <ul>
              {duels.map((d) => {
                const ahead = d.aWins > d.bWins ? 'win' : d.aWins < d.bWins ? 'loss' : 'even';
                return (
                  <li key={d.k} className="border-t border-line first:border-t-0">
                    <Link href={`/g/${groupId}/p/${d.k.slice(2)}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                      <PlayerBadge player={d.k} name={names[d.k]} />
                      <span className="min-w-0 flex-1 truncate font-semibold">gegen {names[d.k]}</span>
                      <span className="font-cond text-2xl font-extrabold tabular-nums">
                        <span className={ahead === 'win' ? 'text-win' : ''}>{d.aWins}</span>
                        <span className="mx-1 text-muted">:</span>
                        <span className={ahead === 'loss' ? 'text-loss' : ''}>{d.bWins}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>
    </>
  );
}
