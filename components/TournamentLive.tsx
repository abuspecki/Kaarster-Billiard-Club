'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { BracketMatch } from '@/lib/bracket';
import type { SessionView } from '@/lib/session-data';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { BracketView } from './BracketView';
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

  return (
    <div className="space-y-4">
      <Link href={`/s/${view.id}`} className="text-sm font-semibold text-emerald-700">
        ‹ Zurück zur Sitzung
      </Link>
      <h1 className="text-2xl font-bold">Turnier</h1>

      {showDraw ? (
        <TeamDraw sessionId={view.id} players={view.players} />
      ) : tournament ? (
        <>
          <BracketView
            sessionId={view.id}
            tournamentId={tournament.id}
            version={tournament.version}
            bracket={tournament.bracket}
            teamNames={tournament.teams.map((t) => t.map(nameOf).join(' + '))}
            canWrite={canWrite}
          />
          {canWrite && tournament.status === 'finished' && (
            <Button variant="secondary" className="w-full" onClick={() => setNewOne(true)}>
              Neues Turnier
            </Button>
          )}
        </>
      ) : (
        <p className="text-stone-600">In dieser Sitzung gab es kein Turnier.</p>
      )}
    </div>
  );
}
