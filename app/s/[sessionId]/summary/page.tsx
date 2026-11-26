import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RankingTable } from '@/components/RankingTable';
import { ShareButton } from '@/components/ShareButton';
import { Card } from '@/components/ui';
import { champion, type BracketMatch } from '@/lib/bracket';
import { loadNames, loadSessionMatches, nameOf } from '@/lib/data';
import { loadSessionView } from '@/lib/session-data';
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
  const display = Object.fromEntries(summary.standings.map((s) => [s.player, nameOf(names, s.player) + (s.player.startsWith('g:') ? ' (Gast)' : '')]));
  const text = formatSummaryText(summary, Object.fromEntries(summary.standings.map((s) => [s.player, nameOf(names, s.player)])), view.groupName, new Date(view.createdAt), tournamentWinner);
  const date = new Date(view.createdAt).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'Europe/Berlin' });

  return (
    <div className="space-y-4">
      <Link href={`/g/${view.groupId}`} className="text-sm font-semibold text-emerald-700">
        ‹ {view.groupName}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">Abend-Zusammenfassung</h1>
        <p className="text-stone-600">
          {date}
          {view.status === 'active' && ' · Sitzung läuft noch'}
        </p>
      </div>

      {summary.playerOfNight ? (
        <div className="rounded-2xl bg-emerald-700 p-5 text-center text-white shadow">
          <div className="text-sm opacity-80">Spieler des Abends</div>
          <div className="text-3xl font-bold">🏆 {nameOf(names, summary.playerOfNight)}</div>
        </div>
      ) : (
        <Card>Noch keine Partien gespielt.</Card>
      )}

      {(tournamentWinner || (summary.longestStreak && summary.longestStreak.length > 1)) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {tournamentWinner && (
            <Card>
              <div className="text-xs text-stone-500">Turniersieger</div>
              <div className="font-semibold">🥇 {tournamentWinner}</div>
            </Card>
          )}
          {summary.longestStreak && summary.longestStreak.length > 1 && (
            <Card>
              <div className="text-xs text-stone-500">Längste Siegesserie</div>
              <div className="font-semibold">
                🔥 {nameOf(names, summary.longestStreak.player)} · {summary.longestStreak.length} am Stück
              </div>
            </Card>
          )}
        </div>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">Ergebnisse des Abends</h2>
        <RankingTable standings={summary.standings} names={display} />
      </Card>

      {summary.playerOfNight && <ShareButton text={text} title="Billiard-Abend" label="Zusammenfassung teilen" variant="primary" className="w-full py-4" />}

      <Link href={`/s/${sessionId}`} className="block text-center text-sm font-semibold text-emerald-700">
        Partien ansehen
      </Link>
    </div>
  );
}
