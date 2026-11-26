'use client';

import { useState, useTransition } from 'react';
import { setTournamentWinner } from '@/app/actions/tournament';
import { canChangeResult, champion, type BracketMatch } from '@/lib/bracket';
import type { SessionPlayer } from '@/lib/session-data';
import { PlayerBadge } from './sport/PlayerBadge';
import { Button, ErrorText } from './ui';

export function roundName(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  return fromEnd === 0 ? 'Finale' : fromEnd === 1 ? 'Halbfinale' : fromEnd === 2 ? 'Viertelfinale' : `Runde ${round}`;
}

const keyOf = (p: SessionPlayer) => (p.userId ? `u:${p.userId}` : `g:${p.id}`);

export function BracketView({
  sessionId,
  tournamentId,
  version,
  bracket,
  teams,
  teamNames,
  players,
  canWrite,
}: {
  sessionId: string;
  tournamentId: string;
  version: number;
  bracket: BracketMatch[];
  teams: string[][];
  teamNames: string[];
  players: SessionPlayer[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const rounds = Math.max(...bracket.map((m) => m.round));
  const winner = champion(bracket);
  const team = (i: number | null) => (i === null ? 'offen' : teamNames[i]);
  const firstPlayer = (i: number) => players.find((p) => p.id === teams[i]?.[0]);

  function choose(matchId: string, t: number) {
    start(async () => {
      const r = await setTournamentWinner(sessionId, tournamentId, version, matchId, t);
      setError(r.error);
      if (!r.error) setOpen(null);
    });
  }

  return (
    <div className="space-y-3">
      {winner !== null && (
        <div className="shadow-card overflow-hidden rounded-xl border border-line bg-surface">
          <div className="bg-accent px-4 py-1.5 text-[11px] font-black tracking-widest text-white uppercase">Turniersieger</div>
          <div className="flex items-center gap-3 p-4">
            <span className="text-4xl">🏆</span>
            <span className="font-cond min-w-0 text-3xl leading-tight font-extrabold break-words uppercase">{teamNames[winner]}</span>
          </div>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: `${rounds * 12.5}rem` }}>
          {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => (
            <div key={round} className="flex w-46 shrink-0 flex-col">
              <h3 className="font-cond mb-2 border-b-2 border-accent pb-1 text-center text-sm font-extrabold tracking-widest uppercase">
                {roundName(round, rounds)}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {bracket
                  .filter((m) => m.round === round)
                  .sort((a, b) => a.slot - b.slot)
                  .map((m) => {
                    const clickable = canWrite && canChangeResult(bracket, m.id);
                    const decided = m.winner !== null;
                    const row = (t: number | null) => {
                      const won = decided && m.winner === t;
                      const lost = decided && t !== null && m.winner !== t;
                      const p = t !== null ? firstPlayer(t) : undefined;
                      return (
                        <div className={`flex items-center gap-2 border-l-[3px] px-2.5 py-2 ${won ? 'border-accent font-bold' : 'border-transparent'} ${lost ? 'text-muted' : ''}`}>
                          {p ? <PlayerBadge player={keyOf(p)} name={p.name} size="sm" /> : <span className="h-6 w-6 shrink-0 rounded-full border border-dashed border-line" />}
                          <span className="min-w-0 flex-1 truncate">
                            {m.isBye && t === null ? <span className="italic text-muted">Freilos</span> : team(t)}
                          </span>
                          {won && <span className="text-accent-text">✓</span>}
                        </div>
                      );
                    };
                    return (
                      <div key={m.id}>
                        <button
                          disabled={!clickable}
                          onClick={() => setOpen(open === m.id ? null : m.id)}
                          className={`shadow-card w-full divide-y divide-line overflow-hidden rounded-lg border bg-surface text-left text-[13px] ${
                            clickable && !decided ? 'border-accent' : 'border-line'
                          }`}
                        >
                          {row(m.teamA)}
                          {row(m.teamB)}
                        </button>
                        {open === m.id && m.teamA !== null && m.teamB !== null && (
                          <div className="mt-1.5 grid gap-1.5">
                            {[m.teamA, m.teamB].map((t) => (
                              <Button key={t} disabled={pending} className="px-2 py-2 text-sm" onClick={() => choose(m.id, t)}>
                                {team(t)} gewinnt
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>
      {canWrite && winner === null && <p className="text-center text-xs text-muted">Rot umrandete Partie antippen, um den Sieger einzutragen.</p>}
    </div>
  );
}
