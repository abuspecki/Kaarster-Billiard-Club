'use client';

import { useState, useTransition } from 'react';
import { setTournamentWinner } from '@/app/actions/tournament';
import { bracketFormat, canChangeResult, champion, normalize, type BracketMatch, type Section } from '@/lib/bracket';
import type { SessionPlayer } from '@/lib/session-data';
import { matchLabel } from '@/lib/tournament-view';
import { PlayerBadge } from './sport/PlayerBadge';
import { Button, ErrorText } from './ui';

const keyOf = (p: SessionPlayer) => (p.userId ? `u:${p.userId}` : `g:${p.id}`);

export function BracketView({
  sessionId,
  tournamentId,
  version,
  bracket: stored,
  teams,
  teamNames,
  players,
  canWrite,
  highlight,
}: {
  sessionId: string;
  tournamentId: string;
  version: number;
  bracket: BracketMatch[];
  teams: string[][];
  teamNames: string[];
  players: SessionPlayer[];
  canWrite: boolean;
  highlight?: string | null; // „Jetzt am Tisch“
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const bracket = normalize(stored);
  const double = bracketFormat(bracket) === 'double';
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

  // leere Partien (beide Seiten Freilos) nicht anzeigen
  const visible = bracket.filter((m) => !(m.isBye && m.teamA === null && m.teamB === null));
  const sections: { key: Section; title: string | null }[] = double
    ? [
        { key: 'W', title: 'Gewinnerrunde' },
        { key: 'L', title: 'Verliererrunde' },
        { key: 'F', title: 'Finale' },
      ]
    : [{ key: 'W', title: null }];

  const card = (m: BracketMatch) => {
    const clickable = canWrite && canChangeResult(bracket, m.id);
    const decided = m.winner !== null;
    const row = (t: number | null) => {
      const won = decided && m.winner === t;
      const lost = decided && t !== null && m.winner !== t;
      const p = t !== null ? firstPlayer(t) : undefined;
      return (
        <div className={`flex items-center gap-2 border-l-[3px] px-2.5 py-2 ${won ? 'border-accent font-bold' : 'border-transparent'} ${lost ? 'text-muted' : ''}`}>
          {p ? <PlayerBadge player={keyOf(p)} name={p.name} size="sm" /> : <span className="h-6 w-6 shrink-0 rounded-full border border-dashed border-line" />}
          <span className="min-w-0 flex-1 truncate">{m.isBye && t === null ? <span className="text-muted italic">Freilos</span> : team(t)}</span>
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
            highlight === m.id ? 'border-2 border-accent' : clickable && !decided ? 'border-accent/60' : 'border-line'
          }`}
        >
          {highlight === m.id && <div className="bg-accent px-2.5 py-0.5 text-[10px] font-black tracking-widest text-white uppercase">Jetzt am Tisch</div>}
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
  };

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
      {sections.map(({ key, title }) => {
        const inSection = visible.filter((m) => (m.section ?? 'W') === key);
        if (inSection.length === 0) return null;
        const rounds = [...new Set(inSection.map((m) => m.round))].sort((a, b) => a - b);
        return (
          <div key={key}>
            {title && <h3 className="font-cond mb-2 text-base font-extrabold tracking-wider uppercase">{title}</h3>}
            <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2">
              <div className="flex gap-3" style={{ minWidth: `${rounds.length * 12.5}rem` }}>
                {rounds.map((round) => {
                  const ms = inSection.filter((m) => m.round === round).sort((a, b) => a.slot - b.slot);
                  return (
                    <div key={round} className="flex w-46 shrink-0 flex-col">
                      <h4 className="font-cond mb-2 border-b-2 border-accent pb-1 text-center text-sm font-extrabold tracking-widest uppercase">
                        {double ? (key === 'F' ? 'Finale' : `Runde ${round}`) : matchLabel(ms[0], bracket)}
                      </h4>
                      <div className="flex flex-1 flex-col justify-around gap-3">{ms.map(card)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      {canWrite && winner === null && <p className="text-center text-xs text-muted">Partie antippen, um den Sieger einzutragen.</p>}
    </div>
  );
}
