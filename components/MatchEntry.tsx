'use client';

import { useState, useTransition } from 'react';
import { deleteMatch, recordMatch, updateMatch } from '@/app/actions/session';
import { isComplete, resize, togglePlayer, type Sides } from '@/lib/match-entry';
import type { SessionMatch, SessionPlayer } from '@/lib/session-data';
import { Button, ErrorText } from './ui';

export function MatchEntry({
  sessionId,
  players,
  initial,
  editing,
  onClose,
}: {
  sessionId: string;
  players: SessionPlayer[];
  initial: Sides;
  editing?: SessionMatch;
  onClose: () => void;
}) {
  const [size, setSize] = useState(Math.max(1, editing?.sideA.length ?? 1));
  const [sides, setSides] = useState<Sides>(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? '?';
  const label = (ids: string[]) => ids.map(nameOf).join(' + ');

  function save(winner: 'A' | 'B') {
    start(async () => {
      const result = editing
        ? await updateMatch(sessionId, editing.id, sides.a, sides.b, winner)
        : await recordMatch(sessionId, sides.a, sides.b, winner);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  function remove() {
    if (!editing || !confirm('Partie wirklich löschen?')) return;
    start(async () => {
      const result = await deleteMatch(sessionId, editing.id);
      if (result.error) setError(result.error);
      else onClose();
    });
  }

  const sideBox = (ids: string[], title: string) => (
    <div className="min-h-14 flex-1 rounded-xl bg-stone-100 p-2 text-center">
      <div className="text-xs text-stone-500">{title}</div>
      <div className="font-semibold">{ids.length ? label(ids) : '–'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-xl space-y-4 rounded-t-3xl bg-white p-4 pb-8 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{editing ? 'Partie ändern' : 'Neue Partie'}</h2>
          <button onClick={onClose} className="px-2 text-2xl text-stone-400" aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-stone-100 p-1 text-sm font-semibold">
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => {
                setSize(n);
                setSides((s) => resize(s, n));
              }}
              className={`rounded-lg py-2 ${size === n ? 'bg-white shadow' : 'text-stone-500'}`}
            >
              {n === 1 ? 'Einzel' : 'Doppel'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const side = sides.a.includes(p.id) ? 'A' : sides.b.includes(p.id) ? 'B' : null;
            return (
              <button
                key={p.id}
                onClick={() => setSides((s) => togglePlayer(s, p.id, size))}
                className={`rounded-full px-4 py-2 font-medium ring-1 ${
                  side === 'A'
                    ? 'bg-emerald-700 text-white ring-emerald-700'
                    : side === 'B'
                      ? 'bg-sky-700 text-white ring-sky-700'
                      : 'bg-white ring-stone-300'
                }`}
              >
                {p.name}
                {p.isGuest && <span className="ml-1 text-xs opacity-70">(Gast)</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {sideBox(sides.a, 'Seite 1')}
          <span className="font-bold text-stone-400">vs</span>
          {sideBox(sides.b, 'Seite 2')}
        </div>

        <ErrorText>{error}</ErrorText>

        {isComplete(sides, size) ? (
          <div className="grid gap-2">
            <p className="text-center text-sm text-stone-600">Wer hat gewonnen?</p>
            <Button disabled={pending} onClick={() => save('A')} className="py-4 text-lg">
              🏆 {label(sides.a)} {size === 1 ? 'gewinnt' : 'gewinnen'}
            </Button>
            <Button disabled={pending} onClick={() => save('B')} className="bg-sky-700 py-4 text-lg hover:bg-sky-800">
              🏆 {label(sides.b)} {size === 1 ? 'gewinnt' : 'gewinnen'}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-stone-500">
            {size === 1 ? 'Tippe zwei Spieler an.' : 'Tippe vier Spieler an – die ersten zwei sind Seite 1.'}
          </p>
        )}

        {editing && (
          <Button variant="danger" disabled={pending} onClick={remove} className="w-full">
            Partie löschen
          </Button>
        )}
      </div>
    </div>
  );
}
