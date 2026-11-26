'use client';

import { useState, useTransition } from 'react';
import { setTournamentWinner } from '@/app/actions/tournament';
import { canChangeResult, champion, type BracketMatch } from '@/lib/bracket';
import { Button, ErrorText } from './ui';

export function roundName(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  return fromEnd === 0 ? 'Finale' : fromEnd === 1 ? 'Halbfinale' : fromEnd === 2 ? 'Viertelfinale' : `Runde ${round}`;
}

export function BracketView({
  sessionId,
  tournamentId,
  version,
  bracket,
  teamNames,
  canWrite,
}: {
  sessionId: string;
  tournamentId: string;
  version: number;
  bracket: BracketMatch[];
  teamNames: string[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const rounds = Math.max(...bracket.map((m) => m.round));
  const winner = champion(bracket);
  const team = (i: number | null) => (i === null ? '…' : teamNames[i]);

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
        <div className="rounded-2xl bg-amber-100 p-4 text-center">
          <div className="text-sm text-amber-800">Turniersieger</div>
          <div className="text-2xl font-bold">🏆 {teamNames[winner]}</div>
        </div>
      )}
      <ErrorText>{error}</ErrorText>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex gap-3" style={{ minWidth: `${rounds * 13}rem` }}>
          {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => (
            <div key={round} className="flex w-48 shrink-0 flex-col">
              <h3 className="mb-2 text-center text-xs font-semibold uppercase text-stone-500">{roundName(round, rounds)}</h3>
              <div className="flex flex-1 flex-col justify-around gap-2">
                {bracket
                  .filter((m) => m.round === round)
                  .sort((a, b) => a.slot - b.slot)
                  .map((m) => {
                    const clickable = canWrite && canChangeResult(bracket, m.id);
                    const row = (t: number | null) => (
                      <div
                        className={`truncate px-3 py-2 ${
                          m.winner !== null && m.winner === t ? 'font-bold text-emerald-800' : m.winner !== null ? 'text-stone-400' : ''
                        }`}
                      >
                        {m.winner !== null && m.winner === t && '✓ '}
                        {m.isBye && t === null ? <span className="italic text-stone-400">Freilos</span> : team(t)}
                      </div>
                    );
                    return (
                      <div key={m.id}>
                        <button
                          disabled={!clickable}
                          onClick={() => setOpen(open === m.id ? null : m.id)}
                          className={`w-full divide-y divide-stone-100 rounded-xl bg-white text-left text-sm shadow-sm ring-1 ${
                            clickable && m.winner === null ? 'ring-emerald-500' : 'ring-stone-200'
                          }`}
                        >
                          {row(m.teamA)}
                          {row(m.teamB)}
                        </button>
                        {open === m.id && m.teamA !== null && m.teamB !== null && (
                          <div className="mt-1 grid gap-1">
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
      {canWrite && winner === null && <p className="text-center text-xs text-stone-500">Partie antippen, um den Sieger einzutragen.</p>}
    </div>
  );
}
