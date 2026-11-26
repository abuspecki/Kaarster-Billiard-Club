import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ShareButton } from '@/components/ShareButton';
import { AppBar } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { LeagueTable } from '@/components/sport/LeagueTable';
import { PlayerBadge } from '@/components/sport/PlayerBadge';
import { SectionCard } from '@/components/sport/SectionCard';
import { StatTiles } from '@/components/sport/StatTiles';
import { champion, type BracketMatch } from '@/lib/bracket';
import { loadNames, loadSessionMatches, nameOf } from '@/lib/data';
import { groupInitials } from '@/lib/design';
import { loadSessionView } from '@/lib/session-data';
import { recentForm } from '@/lib/stats';
import { formatSummaryText, sessionSummary } from '@/lib/summary';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function SummaryPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const view = await loadSessionView(sb, sessionId, user.id);
  if (!view) notFound();

  const [matches, names, { data: tournaments }] = await Promise.all([
    loadSessionMatches(sb, sessionId),
    loadNames(sb, view.groupId, sessionId),
    sb.from('tournaments').select('teams, bracket').eq('session_id', sessionId).eq('status', 'finished').order('created_at', { ascending: false }).limit(1),
  ]);

  const summary = sessionSummary(matches);
  let tournamentWinner: string | undefined;
  const t = (tournaments ?? [])[0] as { teams: string[][]; bracket: BracketMatch[] } | undefined;
  if (t) {
    const c = champion(t.bracket);
    if (c !== null) tournamentWinner = t.teams[c].map((id) => view.players.find((p) => p.id === id)?.name ?? '?').join(' + ');
  }
  const plain = Object.fromEntries(summary.standings.map((s) => [s.player, nameOf(names, s.player)]));
  const display = Object.fromEntries(summary.standings.map((s) => [s.player, plain[s.player] + (s.player.startsWith('g:') ? ' (Gast)' : '')]));
  const forms = Object.fromEntries(summary.standings.map((s) => [s.player, recentForm(matches, s.player)]));
  const text = formatSummaryText(summary, plain, view.groupName, new Date(view.createdAt), tournamentWinner);
  const date = new Date(view.createdAt).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
  const pon = summary.playerOfNight;
  const ponStanding = summary.standings.find((s) => s.player === pon);

  return (
    <>
      <AppBar title="Spielbericht" subtitle={view.groupName} back={{ href: `/g/${view.groupId}`, label: view.groupName }} />
      <div className="space-y-3 p-4">
        <section className="shadow-card overflow-hidden rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between bg-bar px-4 py-2 text-bar-fg">
            <span className="font-cond text-sm font-extrabold tracking-widest uppercase">{groupInitials(view.groupName)} · Spielbericht</span>
            <span className="text-xs text-bar-muted">{date}</span>
          </div>
          {pon ? (
            <div className="flex items-center gap-4 p-5">
              <PlayerBadge player={pon} name={plain[pon]} size="lg" />
              <div className="min-w-0">
                <div className="text-[11px] font-black tracking-widest text-accent-text uppercase">Spieler des Abends</div>
                <div className="font-cond truncate text-4xl leading-none font-extrabold uppercase">{plain[pon]}</div>
                {ponStanding && (
                  <div className="mt-1 text-sm text-muted">
                    {ponStanding.wins} {ponStanding.wins === 1 ? 'Sieg' : 'Siege'} · {ponStanding.losses}{' '}
                    {ponStanding.losses === 1 ? 'Niederlage' : 'Niederlagen'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Noch keine Partien" text={view.status === 'active' ? 'Die Sitzung läuft noch.' : undefined} />
          )}
          {pon && (
            <div className="px-4 pb-4">
              <StatTiles
                items={[
                  { value: matches.length, label: 'Partien' },
                  { value: summary.longestStreak?.length ?? 0, label: 'Längste Serie' },
                  { value: view.players.length, label: 'Spieler' },
                ]}
              />
            </div>
          )}
        </section>

        {tournamentWinner && (
          <SectionCard>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div className="min-w-0">
                <div className="text-[11px] font-black tracking-widest text-muted uppercase">Turniersieger</div>
                <div className="font-cond truncate text-2xl font-extrabold uppercase">{tournamentWinner}</div>
              </div>
            </div>
          </SectionCard>
        )}

        {summary.longestStreak && summary.longestStreak.length > 1 && (
          <SectionCard>
            <div className="flex items-center gap-3">
              <PlayerBadge player={summary.longestStreak.player} name={plain[summary.longestStreak.player] ?? '?'} />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-black tracking-widest text-muted uppercase">Längste Siegesserie</div>
                <div className="truncate font-semibold">{plain[summary.longestStreak.player]}</div>
              </div>
              <span className="font-cond text-3xl font-extrabold">{summary.longestStreak.length}×</span>
            </div>
          </SectionCard>
        )}

        {summary.standings.length > 0 && (
          <SectionCard title="Ergebnisse des Abends" flush>
            <LeagueTable standings={summary.standings} names={display} forms={forms} />
          </SectionCard>
        )}

        {pon && <ShareButton text={text} title="Billiard-Abend" label="Spielbericht teilen" variant="primary" className="w-full py-4" />}

        <Link href={`/s/${sessionId}`} className="block py-2 text-center text-sm font-bold text-accent-text">
          Alle Partien ansehen ›
        </Link>
      </div>
    </>
  );
}
