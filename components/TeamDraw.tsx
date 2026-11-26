'use client';

import { useState, useTransition } from 'react';
import { createTournament } from '@/app/actions/tournament';
import type { SessionPlayer } from '@/lib/session-data';
import { drawTeams } from '@/lib/teams';
import { Button, Card, ErrorText } from './ui';

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
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-semibold">Wer spielt mit?</h2>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePlayer(p.id)}
              className={`rounded-full px-4 py-2 font-medium ring-1 ${
                selected.includes(p.id) ? 'bg-emerald-700 text-white ring-emerald-700' : 'bg-white text-stone-400 ring-stone-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        <h2 className="mb-2 mt-4 font-semibold">Spieler pro Team</h2>
        <div className="grid grid-cols-4 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => {
                setSize(n);
                setTeams(null);
              }}
              className={`rounded-lg py-2 ${size === n ? 'bg-white shadow' : 'text-stone-500'}`}
            >
              {n === 1 ? 'Jeder für sich' : n}
            </button>
          ))}
        </div>
        <Button onClick={draw} className="mt-4 w-full" variant={teams ? 'secondary' : 'primary'}>
          🎲 {teams ? 'Neu mischen' : 'Teams auslosen'}
        </Button>
        <ErrorText>{error}</ErrorText>
      </Card>

      {teams && (
        <Card>
          <h2 className="mb-1 font-semibold">Teams</h2>
          <p className="mb-3 text-xs text-stone-500">Spieler antippen, um ihn ins nächste Team zu schieben.</p>
          <ol className="space-y-2">
            {teams.map((t, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-2">
                <span className="w-16 text-sm font-semibold text-stone-500">Team {i + 1}</span>
                {t.map((id) => (
                  <button key={id} onClick={() => moveToNextTeam(id)} className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-300">
                    {nameOf(id)}
                  </button>
                ))}
                {t.length === 0 && <span className="text-sm text-red-600">leer</span>}
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
        </Card>
      )}
    </div>
  );
}
