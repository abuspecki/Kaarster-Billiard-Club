import Link from 'next/link';
import { notFound } from 'next/navigation';
import { startSession } from '@/app/actions/groups';
import { ActionButton } from '@/components/ActionButton';
import { ShareButton } from '@/components/ShareButton';
import { AppBar } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { LeagueTable } from '@/components/sport/LeagueTable';
import { LiveCard } from '@/components/sport/LiveCard';
import { PlayerBadge } from '@/components/sport/PlayerBadge';
import { ResultStrip } from '@/components/sport/ResultStrip';
import { SectionCard } from '@/components/sport/SectionCard';
import { StatTiles } from '@/components/sport/StatTiles';
import { Tabs } from '@/components/sport/Tabs';
import { champion, type BracketMatch } from '@/lib/bracket';
import { loadGroup, loadGroupMatches, loadNames } from '@/lib/data';
import { groupInitials } from '@/lib/design';
import { berlinTime, dayLabel, lastEvening, parseTab, stripItems, type GroupTab } from '@/lib/group-view';
import { displayName } from '@/lib/names';
import { computeStandings, recentForm } from '@/lib/stats';
import { sessionSummary } from '@/lib/summary';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';
import type { MatchRecord, PlayerKey, Standing } from '@/lib/types';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });

const TAB_LABELS: Record<GroupTab, string> = { uebersicht: 'Übersicht', tabelle: 'Tabelle', turniere: 'Turniere', spieler: 'Spieler' };

type SessionRow = { id: string; code: string; status: string; created_at: string };

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { groupId } = await params;
  const tab = parseTab((await searchParams).tab);
  const user = await requireUser();
  const sb = await createServerSupabase();
  const group = await loadGroup(sb, groupId, user.id);
  if (!group) notFound();
  await sb.rpc('end_stale_sessions', { p_group_id: groupId }); // vergessene Sitzungen beenden

  const [matches, names, { data: sessionData }] = await Promise.all([
    loadGroupMatches(sb, groupId),
    loadNames(sb, groupId),
    sb.from('sessions').select('id, code, status, created_at').eq('group_id', groupId).order('created_at', { ascending: false }).limit(50),
  ]);
  const sessions = (sessionData ?? []) as SessionRow[];
  const memberKeys = new Set(Object.keys(names));

  // Rangliste inkl. Mitglieder ohne Partien (unten).
  const standings = computeStandings(matches);
  const ranked = new Set(standings.map((s) => s.player));
  const idle: Standing[] = Object.keys(names)
    .filter((k) => !ranked.has(k))
    .sort((a, b) => names[a].localeCompare(names[b], 'de'))
    .map((player) => ({ player, wins: 0, losses: 0, played: 0, winRate: 0, singlesWins: 0, singlesLosses: 0, teamWins: 0, teamLosses: 0 }));
  const table = [...standings, ...idle];
  const forms = Object.fromEntries(table.map((s) => [s.player, recentForm(matches, s.player)]));
  const profileHref = (p: PlayerKey) => (memberKeys.has(p) ? `/g/${groupId}/p/${p.slice(2)}` : null);

  const tabs = (Object.keys(TAB_LABELS) as GroupTab[]).map((key) => ({
    key,
    label: TAB_LABELS[key],
    href: key === 'uebersicht' ? `/g/${groupId}` : `/g/${groupId}?tab=${key}`,
  }));

  return (
    <>
      <AppBar
        title={group.name}
        subtitle={[group.location, `${memberKeys.size} ${memberKeys.size === 1 ? 'Mitglied' : 'Mitglieder'}`].filter(Boolean).join(' · ')}
        initials={groupInitials(group.name)}
        back={{ href: '/', label: 'Meine Gruppen' }}
        right={
          group.isAdmin ? (
            <Link href={`/g/${groupId}/settings`} aria-label="Einstellungen" className="grid h-9 w-9 place-items-center rounded-lg text-xl text-bar-muted hover:bg-white/10">
              ⚙
            </Link>
          ) : undefined
        }
      >
        <Tabs tabs={tabs} active={tab} />
      </AppBar>

      {tab === 'uebersicht' && (
        <Overview groupId={groupId} group={group} matches={matches} names={names} sessions={sessions} table={table} forms={forms} profileHref={profileHref} />
      )}

      {tab === 'tabelle' && (
        <div className="p-4">
          <SectionCard title="Tabelle" flush>
            {table.length ? (
              <LeagueTable standings={table} names={names} forms={forms} profileHref={profileHref} />
            ) : (
              <EmptyState title="Noch leer" text="Sobald ihr Partien eintragt, entsteht hier die Tabelle." />
            )}
          </SectionCard>
          <p className="mt-2 px-1 text-xs text-muted">S = Siege · N = Niederlagen · Form = letzte 5 Partien. Doppel- und Teamsiege zählen für jeden Spieler.</p>
        </div>
      )}

      {tab === 'turniere' && <Tournaments sessions={sessions} />}

      {tab === 'spieler' && (
        <div className="p-4">
          <SectionCard title="Spieler" flush>
            <ul>
              {Object.keys(names)
                .sort((a, b) => names[a].localeCompare(names[b], 'de'))
                .map((k) => {
                  const s = standings.find((x) => x.player === k);
                  return (
                    <li key={k} className="border-t border-line first:border-t-0">
                      <Link href={profileHref(k)!} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <PlayerBadge player={k} name={names[k]} />
                        <span className="min-w-0 flex-1 truncate font-semibold">{names[k]}</span>
                        <span className="text-sm text-muted">{s ? `${s.wins} S · ${s.losses} N` : 'noch keine Partie'}</span>
                        <span className="text-muted">›</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </SectionCard>
        </div>
      )}
    </>
  );
}

function Overview({
  groupId,
  group,
  matches,
  names,
  sessions,
  table,
  forms,
  profileHref,
}: {
  groupId: string;
  group: { name: string; invite_code: string };
  matches: MatchRecord[];
  names: Record<PlayerKey, string>;
  sessions: SessionRow[];
  table: Standing[];
  forms: Record<PlayerKey, ('W' | 'L')[]>;
  profileHref: (p: PlayerKey) => string | null;
}) {
  const active = sessions.filter((s) => s.status === 'active');
  const activeIds = new Set(active.map((s) => s.id));
  const liveMatchIds = new Set(matches.filter((m) => m.sessionId && activeIds.has(m.sessionId)).map((m) => m.id));
  const bySession = new Map<string, MatchRecord[]>();
  for (const m of matches) if (m.sessionId) bySession.set(m.sessionId, [...(bySession.get(m.sessionId) ?? []), m]);
  const evening = lastEvening(sessions, bySession);
  const eveningSummary = evening ? sessionSummary(evening.matches) : null;
  const eveningDate = evening ? sessions.find((s) => s.id === evening.sessionId)?.created_at : undefined;
  const hasMatches = matches.length > 0;

  return (
    <>
      <ResultStrip items={stripItems(matches, names, liveMatchIds)} />
      <div className="space-y-3 p-4">
        {active.map((s) => {
          const count = bySession.get(s.id)?.length ?? 0;
          return (
            <LiveCard
              key={s.id}
              href={`/s/${s.id}`}
              title="Sitzung läuft"
              meta={`seit ${dayLabel(s.created_at) === 'HEUTE' ? '' : `${dateLabel(s.created_at)}, `}${berlinTime(s.created_at)} · ${count} ${count === 1 ? 'Partie' : 'Partien'} · Code ${s.code}`}
            />
          );
        })}

        <ActionButton action={startSession.bind(null, groupId)} variant={active.length ? 'secondary' : 'primary'} className="w-full py-4 text-base">
          ▶ Neue Sitzung starten
        </ActionButton>

        <SectionCard title="Tabelle" action={hasMatches ? <Link href={`/g/${groupId}?tab=tabelle`}>Alle ›</Link> : undefined} flush>
          {hasMatches ? (
            <LeagueTable standings={table} names={names} forms={forms} profileHref={profileHref} limit={5} />
          ) : (
            <EmptyState title="Noch keine Partien" text="Startet eine Sitzung und tragt eure erste Partie ein – dann füllt sich hier die Tabelle." />
          )}
        </SectionCard>

        {eveningSummary && evening && (
          <SectionCard
            title={`Letzter Abend · ${dateLabel(eveningDate ?? evening.matches[0].playedAt)}`}
            action={<Link href={`/s/${evening.sessionId}/summary`}>Spielbericht ›</Link>}
          >
            <StatTiles
              items={[
                { value: evening.matches.length, label: 'Partien' },
                { value: eveningSummary.playerOfNight ? displayName(names, eveningSummary.playerOfNight) : '–', label: 'Bester Spieler' },
                { value: eveningSummary.longestStreak?.length ?? 0, label: 'Längste Serie' },
              ]}
            />
          </SectionCard>
        )}

        {(() => {
          const past = sessions.filter((x) => x.status === 'ended' && (bySession.get(x.id)?.length ?? 0) > 0 && x.id !== evening?.sessionId).slice(0, 10);
          if (past.length === 0) return null;
          return (
            <SectionCard title="Frühere Abende" flush>
              <ul>
                {past.map((x) => {
                  const n = bySession.get(x.id)?.length ?? 0;
                  return (
                    <li key={x.id} className="border-t border-line first:border-t-0">
                      <Link href={`/s/${x.id}/summary`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <span className="min-w-0 flex-1 truncate font-semibold">{dateLabel(x.created_at)}</span>
                        <span className="text-sm text-muted">
                          {n} {n === 1 ? 'Partie' : 'Partien'}
                        </span>
                        <span className="text-muted">›</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          );
        })()}

        <SectionCard title="Freunde einladen">
          <p className="mb-3 text-sm text-muted">
            Einladungscode <span className="font-mono font-bold tracking-widest text-fg">{group.invite_code}</span>
          </p>
          <ShareButton
            url={`/join/${group.invite_code}`}
            text={`Komm in unsere Billiard-Gruppe „${group.name}“!`}
            title="Einladung"
            label="Einladungslink teilen"
            className="w-full"
          />
        </SectionCard>
      </div>
    </>
  );
}

async function Tournaments({ sessions }: { sessions: SessionRow[] }) {
  const sb = await createServerSupabase();
  const ids = sessions.map((s) => s.id);
  const { data } = ids.length
    ? await sb.from('tournaments').select('id, session_id, teams, bracket, status, created_at').in('session_id', ids).order('created_at', { ascending: false })
    : { data: [] };
  const tournaments = (data ?? []) as { id: string; session_id: string; teams: string[][]; bracket: BracketMatch[]; status: string; created_at: string }[];
  const playerIds = [...new Set(tournaments.flatMap((t) => t.teams.flat()))];
  const { data: players } = playerIds.length
    ? await sb.from('session_players').select('id, guest_name, profiles(display_name)').in('id', playerIds)
    : { data: [] };
  const nameById = new Map(
    ((players ?? []) as unknown as { id: string; guest_name: string | null; profiles: { display_name: string } | null }[]).map((p) => [
      p.id,
      p.profiles?.display_name ?? p.guest_name ?? '?',
    ]),
  );

  return (
    <div className="p-4">
      <SectionCard title="Turniere" flush>
        {tournaments.length === 0 ? (
          <EmptyState title="Noch kein Turnier" text="Startet in einer Sitzung ein Turnier – Teams werden ausgelost und der Turnierbaum füllt sich mit jedem Ergebnis." />
        ) : (
          <ul>
            {tournaments.map((t) => {
              const c = champion(t.bracket);
              const winner = c !== null ? t.teams[c].map((id) => nameById.get(id) ?? '?').join(' + ') : null;
              return (
                <li key={t.id} className="border-t border-line first:border-t-0">
                  <Link href={`/s/${t.session_id}/tournament`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="font-cond grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-xl">🏆</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted">
                        {dateLabel(t.created_at)} · {t.teams.length} Teams
                      </span>
                      <span className="block truncate font-semibold">{winner ? `Sieger: ${winner}` : 'Läuft noch'}</span>
                    </span>
                    <span className="text-muted">›</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      <p className="mt-2 px-1 text-xs text-muted">Ein neues Turnier startest du in einer laufenden Sitzung.</p>
    </div>
  );
}
