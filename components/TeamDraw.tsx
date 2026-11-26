'use client';

import { useState, useTransition } from 'react';
import { createTournament } from '@/app/actions/tournament';
import type { SessionPlayer } from '@/lib/session-data';
import { drawTeams } from '@/lib/teams';
import { PlayerBadge } from './sport/PlayerBadge';
import { SectionCard } from './sport/SectionCard';
import { Button, ErrorText } from './ui';

const keyOf = (p: SessionPlayer) => (p.userId ? `u:${p.userId}` : `g:${p.id}`);

export function TeamDraw({ sessionId, players }: { sessionId: string; players: SessionPlayer[] }) {
  const [selected, setSelected] = useState<string[]>(players.map((p) => p.id));
  const [size, setSize] = useState(1);
  const [teams, setTeams] = useState<string[][] | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  function draw() {
    try {
      setTeams(drawTeams(selected, size));
      setError(undefined);
    } catch (e) {
      setTeams(null);
      setError((e as Error).message);
    }
  }

  function moveToNextTeam(id: string) {
    if (!teams) return;
    const from = teams.findIndex((t) => t.includes(id));
    const to = (from + 1) % teams.length;
    setTeams(teams.map((t, i) => (i === from ? t.filter((x) => x !== id) : i === to ? [...t, id] : t)));
  }

  function togglePlayer(id: string) {
    setTeams(null);
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const valid = teams !== null && teams.length >= 2 && teams.every((t) => t.length > 0);

  return (
    <div className="space-y-3">
      <SectionCard title="Wer spielt mit?">
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`flex items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1 font-semibold transition ${
                selected.includes(p.id) ? 'border-accent bg-accent-soft' : 'border-line bg-surface text-muted opacity-60'
              }`}
            >
              <PlayerBadge player={keyOf(p)} name={p.name} />
              {p.name}
            </button>
          ))}
        </div>
        <h3 className="mt-4 mb-2 text-xs font-bold tracking-wide text-muted uppercase">Spieler pro Team</h3>
        <div className="grid grid-cols-4 rounded-lg bg-surface-2 p-1 text-sm font-bold">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => {
                setSize(n);
                setTeams(null);
              }}
              className={`rounded-md py-2 ${size === n ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}
            >
              {n === 1 ? 'Jeder für sich' : n}
            </button>
          ))}
        </div>
        <Button onClick={draw} className="mt-4 w-full" variant={teams ? 'secondary' : 'primary'}>
          🎲 {teams ? 'Neu mischen' : 'Teams auslosen'}
        </Button>
        <ErrorText>{error}</ErrorText>
      </SectionCard>

      {teams && (
        <SectionCard title="Teams">
          <p className="mb-3 text-xs text-muted">Spieler antippen, um ihn ins nächste Team zu schieben.</p>
          <ol className="space-y-2">
            {teams.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
                <span className="font-cond w-16 text-sm font-extrabold tracking-wide text-muted uppercase">Team {i + 1}</span>
                {t.map((id) => (
                  <button key={id} onClick={() => moveToNextTeam(id)} className="flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pr-3 pl-0.5 text-sm font-semibold">
                    {(() => {
                      const p = players.find((x) => x.id === id);
                      return p ? <PlayerBadge player={keyOf(p)} name={p.name} size="sm" /> : null;
                    })()}
                    {nameOf(id)}
                  </button>
                ))}
                {t.length === 0 && <span className="text-sm font-semibold text-accent-text">leer</span>}
              </li>
            ))}
          </ol>
          <Button
            className="mt-4 w-full py-4 text-lg"
            disabled={!valid || pending}
            onClick={() =>
              start(async () => {
                const r = await createTournament(sessionId, size, teams);
                setError(r.error);
              })
            }
          >
            🏆 Turnier starten
          </Button>
        </SectionCard>
      )}
    </div>
  );
}
