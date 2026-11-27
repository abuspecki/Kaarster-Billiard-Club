'use client';

import { useState, useTransition } from 'react';
import { deleteMatch, recordMatch, updateMatch } from '@/app/actions/session';
import { isComplete, orderForEntry, resize, togglePlayer, type Sides } from '@/lib/match-entry';
import type { SessionMatch, SessionPlayer } from '@/lib/session-data';
import { PlayerBadge } from './sport/PlayerBadge';
import { Button, ErrorText } from './ui';

const keyOf = (p: SessionPlayer) => (p.userId ? `u:${p.userId}` : `g:${p.id}`);

export function MatchEntry({
  sessionId,
  players,
  initial,
  editing,
  onClose,
  onSaved,
}: {
  sessionId: string;
  players: SessionPlayer[];
  initial: Sides;
  editing?: SessionMatch;
  onClose: () => void;
  onSaved?: (message: string, undoMatchId?: string) => void;
}) {
  const [size, setSize] = useState(Math.max(1, editing?.sideA.length ?? 1));
  const [sides, setSides] = useState<Sides>(initial);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const byId = (id: string) => players.find((p) => p.id === id);
  const label = (ids: string[]) => ids.map((id) => byId(id)?.name ?? '?').join(' + ');

  function save(winner: 'A' | 'B') {
    start(async () => {
      if (editing) {
        const result = await updateMatch(sessionId, editing.id, sides.a, sides.b, winner);
        if (result.error) return setError(result.error);
        onSaved?.('Geändert ✓');
      } else {
        const result = await recordMatch(sessionId, sides.a, sides.b, winner);
        if (result.error) return setError(result.error);
        onSaved?.(`✓ ${label(winner === 'A' ? sides.a : sides.b)} gewinnt`, result.id);
      }
      onClose();
    });
  }

  function remove() {
    if (!editing || !confirm('Partie wirklich löschen?')) return;
    start(async () => {
      const result = await deleteMatch(sessionId, editing.id);
      if (result.error) return setError(result.error);
      onSaved?.('Partie gelöscht');
      onClose();
    });
  }

  const sideBox = (ids: string[], title: string, tone: 'a' | 'b') => (
    <div className={`min-h-16 flex-1 rounded-lg border-2 p-2 text-center ${ids.length ? (tone === 'a' ? 'border-accent' : 'border-fg/60') : 'border-dashed border-line'}`}>
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{title}</div>
      <div className="font-cond mt-0.5 line-clamp-2 text-lg leading-tight font-extrabold">{ids.length ? label(ids) : '–'}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-4 pb-8 text-fg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="font-cond text-2xl font-extrabold uppercase">{editing ? 'Partie ändern' : 'Neue Partie'}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-xl text-muted" aria-label="Schließen">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 rounded-lg bg-surface-2 p-1 text-sm font-bold">
          {[1, 2].map((n) => (
            <button
              key={n}
              onClick={() => {
                setSize(n);
                setSides((s) => resize(s, n));
              }}
              className={`rounded-md py-2 transition ${size === n ? 'bg-surface text-fg shadow-sm' : 'text-muted'}`}
            >
              {n === 1 ? 'Einzel' : 'Doppel'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {orderForEntry(players).map((p) => {
            const side = sides.a.includes(p.id) ? 'A' : sides.b.includes(p.id) ? 'B' : null;
            return (
              <button
                key={p.id}
                onClick={() => setSides((s) => togglePlayer(s, p.id, size))}
                className={`flex max-w-full items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1 font-semibold transition ${p.paused && !side ? 'opacity-45' : ''} ${
                  side === 'A' ? 'border-accent bg-accent-soft' : side === 'B' ? 'border-fg/60 bg-surface-2' : 'border-line bg-surface'
                }`}
              >
                <PlayerBadge player={keyOf(p)} name={p.name} />
                <span className="truncate">{p.name}</span>
                {p.isGuest && <span className="text-xs text-muted">Gast</span>}
                {p.paused && <span className="text-xs text-muted">⏸ Pause</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {sideBox(sides.a, 'Seite 1', 'a')}
          <span className="font-cond text-lg font-extrabold text-muted">VS</span>
          {sideBox(sides.b, 'Seite 2', 'b')}
        </div>

        <ErrorText>{error}</ErrorText>

        {isComplete(sides, size) ? (
          <div className="grid gap-2">
            <p className="text-center text-xs font-bold tracking-wide text-muted uppercase">Wer hat gewonnen?</p>
            <Button disabled={pending} onClick={() => save('A')} className="py-4 text-lg">
              🏆 {label(sides.a)} {size === 1 ? 'gewinnt' : 'gewinnen'}
            </Button>
            <Button disabled={pending} variant="secondary" onClick={() => save('B')} className="py-4 text-lg">
              🏆 {label(sides.b)} {size === 1 ? 'gewinnt' : 'gewinnen'}
            </Button>
          </div>
        ) : (
          <p className="text-center text-sm text-muted">
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
