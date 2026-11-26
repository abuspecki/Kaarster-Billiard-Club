import Link from 'next/link';
import { notFound } from 'next/navigation';
import { startSession } from '@/app/actions/groups';
import { RankingTable } from '@/components/RankingTable';
import { ShareButton } from '@/components/ShareButton';
import { Button, Card } from '@/components/ui';
import { loadGroup, loadGroupMatches, loadNames } from '@/lib/data';
import { computeStandings } from '@/lib/stats';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';
import type { Standing } from '@/lib/types';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const group = await loadGroup(sb, groupId, user.id);
  if (!group) notFound();

  const [matches, names, { data: sessions }] = await Promise.all([
    loadGroupMatches(sb, groupId),
    loadNames(sb, groupId),
    sb.from('sessions').select('id, code, status, created_at').eq('group_id', groupId).order('created_at', { ascending: false }).limit(20),
  ]);

  const standings = computeStandings(matches);
  // Mitglieder ohne Partien unten anhängen, damit jeder sich findet.
  const ranked = new Set(standings.map((s) => s.player));
  const idle: Standing[] = Object.keys(names)
    .filter((k) => !ranked.has(k))
    .sort((a, b) => names[a].localeCompare(names[b], 'de'))
    .map((player) => ({ player, wins: 0, losses: 0, played: 0, winRate: 0, singlesWins: 0, singlesLosses: 0, teamWins: 0, teamLosses: 0 }));
  const memberKeys = new Set(Object.keys(names));

  const all = (sessions ?? []) as { id: string; code: string; status: string; created_at: string }[];
  const active = all.filter((s) => s.status === 'active');
  const ended = all.filter((s) => s.status === 'ended').slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {group.isAdmin && (
          <Link href={`/g/${groupId}/settings`} className="pt-1 text-sm font-semibold text-emerald-700">
            Einstellungen
          </Link>
        )}
      </div>

      {active.map((s) => (
        <Link key={s.id} href={`/s/${s.id}`} className="block rounded-2xl bg-emerald-700 p-4 text-white shadow">
          <div className="text-sm opacity-80">Läuft gerade · seit {fmt(s.created_at)}</div>
          <div className="text-lg font-semibold">Sitzung öffnen · Code {s.code}</div>
        </Link>
      ))}

      <form action={startSession.bind(null, groupId)}>
        <Button className="w-full py-4 text-lg">▶ Sitzung starten</Button>
      </form>

      <Card>
        <h2 className="mb-2 font-semibold">Rangliste</h2>
        <RankingTable
          standings={[...standings, ...idle]}
          names={names}
          profileHref={(p) => (memberKeys.has(p) ? `/g/${groupId}/p/${p.slice(2)}` : null)}
        />
      </Card>

      {ended.length > 0 && (
        <Card>
          <h2 className="mb-2 font-semibold">Letzte Sitzungen</h2>
          <ul className="divide-y divide-stone-100">
            {ended.map((s) => (
              <li key={s.id}>
                <Link href={`/s/${s.id}/summary`} className="flex justify-between py-2">
                  {fmt(s.created_at)}
                  <span className="text-stone-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-1 font-semibold">Freunde einladen</h2>
        <p className="mb-3 text-sm text-stone-600">
          Einladungscode: <span className="font-mono font-bold tracking-widest">{group.invite_code}</span>
        </p>
        <ShareButton
          url={`/join/${group.invite_code}`}
          text={`Komm in unsere Billiard-Gruppe „${group.name}“!`}
          title="Einladung"
          label="Einladungslink teilen"
          className="w-full"
        />
      </Card>
    </div>
  );
}
