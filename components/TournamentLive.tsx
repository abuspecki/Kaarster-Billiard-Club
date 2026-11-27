'use client';

import { useState } from 'react';
import { bracketFormat, type BracketMatch } from '@/lib/bracket';
import { nowAndNext, pausedTeamIndexes } from '@/lib/queue';
import { pairing } from '@/lib/tournament-view';
import type { SessionView } from '@/lib/session-data';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { BracketView } from './BracketView';
import { AppBar, LiveBadge, MutedBadge } from './sport/AppBar';
import { EmptyState } from './sport/EmptyState';
import { NowPlaying } from './sport/NowPlaying';
import { SectionCard } from './sport/SectionCard';
import { TeamDraw } from './TeamDraw';
import { Button } from './ui';

export interface TournamentData {
  id: string;
  version: number;
  status: 'running' | 'finished';
  teams: string[][];
  bracket: BracketMatch[];
}

export function TournamentLive({ view, tournament }: { view: SessionView; tournament: TournamentData | null }) {
  useRealtimeRefresh(view.id);
  const [newOne, setNewOne] = useState(false);
  const canWrite = view.status === 'active' && view.me.playerId !== null;
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  const showDraw = canWrite && (!tournament || (tournament.status === 'finished' && newOne));
  const paused = new Set(view.players.filter((p) => p.paused).map((p) => p.id));
  const queue = tournament ? nowAndNext(tournament.bracket, pausedTeamIndexes(tournament.teams, paused)) : null;

  return (
    <>
      <AppBar
        title="Turnier"
        subtitle={tournament && !showDraw ? `${tournament.teams.length} Teams · ${bracketFormat(tournament.bracket) === 'double' ? 'Doppel-K.o.' : 'K.o.-System'}` : view.groupName}
        badge={tournament && !showDraw ? tournament.status === 'running' ? <LiveBadge /> : <MutedBadge label="BEENDET" /> : undefined}
        back={{ href: `/s/${view.id}`, label: 'Zurück zur Sitzung' }}
      />
      <div className="space-y-3 p-4">
        {showDraw ? (
          <TeamDraw sessionId={view.id} players={view.players} />
        ) : tournament ? (
          <>
            {tournament.status === 'running' && queue && (
              <NowPlaying
                now={pairing(queue.now, tournament.bracket, tournament.teams, view.players)}
                next={pairing(queue.next, tournament.bracket, tournament.teams, view.players)}
                pausedCount={queue.paused.length}
              />
            )}
            <BracketView
              highlight={queue?.now?.id ?? null}
              sessionId={view.id}
              tournamentId={tournament.id}
              version={tournament.version}
              bracket={tournament.bracket}
              teams={tournament.teams}
              teamNames={tournament.teams.map((t) => t.map(nameOf).join(' + '))}
              players={view.players}
              canWrite={canWrite}
            />
            {canWrite && tournament.status === 'finished' && (
              <Button variant="secondary" className="w-full" onClick={() => setNewOne(true)}>
                Neues Turnier
              </Button>
            )}
          </>
        ) : (
          <SectionCard>
            <EmptyState title="Kein Turnier" text="In dieser Sitzung wurde kein Turnier gespielt." />
          </SectionCard>
        )}
      </div>
    </>
  );
}
