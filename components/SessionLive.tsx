'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { addGuest, endSession, joinSession } from '@/app/actions/session';
import type { Sides } from '@/lib/match-entry';
import type { SessionMatch, SessionView } from '@/lib/session-data';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { MatchEntry } from './MatchEntry';
import { ShareButton } from './ShareButton';
import { Button, Card, ErrorText, Input } from './ui';

const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

export function SessionLive({ view, canEnd }: { view: SessionView; canEnd: boolean }) {
  useRealtimeRefresh(view.id);
  const [entry, setEntry] = useState<{ initial: Sides; editing?: SessionMatch } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const active = view.status === 'active';
  const canWrite = active && view.me.playerId !== null;
  const nameOf = (id: string) => view.players.find((p) => p.id === id)?.name ?? '?';
  const label = (ids: string[]) => ids.map(nameOf).join(' + ');

  const act = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r?.error);
    });

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/g/${view.groupId}`} className="text-sm font-semibold text-emerald-700">
          ‹ {view.groupName}
        </Link>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{active ? 'Sitzung läuft' : 'Sitzung beendet'}</h1>
          {active && (
            <ShareButton url={`/join/${view.code}`} text={`Spiel mit! Code: ${view.code}`} title="Billiard-Sitzung" label={`Code ${view.code}`} className="font-mono" />
          )}
        </div>
      </div>

      <ErrorText>{error}</ErrorText>

      {!active && (
        <Link href={`/s/${view.id}/summary`} className="block rounded-2xl bg-emerald-700 p-4 text-center font-semibold text-white">
          Zur Abend-Zusammenfassung
        </Link>
      )}

      {active && view.me.playerId === null && (
        <Button className="w-full py-4 text-lg" disabled={pending} onClick={() => act(() => joinSession(view.id, view.code))}>
          Mitspielen
        </Button>
      )}

      {canWrite && (
        <Button
          className="w-full py-5 text-xl"
          onClick={() => setEntry({ initial: { a: view.me.playerId ? [view.me.playerId] : [], b: [] } })}
        >
          + Partie eintragen
        </Button>
      )}

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Spieler ({view.players.length})</h2>
          {canWrite && (
            <button onClick={() => setShowGuest((v) => !v)} className="text-sm font-semibold text-emerald-700">
              + Gast
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {view.players.map((p) => (
            <span key={p.id} className="rounded-full bg-stone-100 px-3 py-1 text-sm">
              {p.name}
              {p.isGuest && <span className="ml-1 text-xs text-stone-500">(Gast)</span>}
            </span>
          ))}
        </div>
        {showGuest && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const r = await addGuest(view.id, guestName);
                if (!r.error) {
                  setGuestName('');
                  setShowGuest(false);
                }
                return r;
              });
            }}
          >
            <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Name des Gasts" maxLength={40} required autoFocus />
            <Button disabled={pending} className="shrink-0">
              Hinzufügen
            </Button>
          </form>
        )}
        <p className="mt-2 text-xs text-stone-500">Gäste zählen heute mit, aber nicht in der Gruppen-Rangliste.</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Partien ({view.matches.length})</h2>
        {view.matches.length === 0 ? (
          <p className="text-sm text-stone-500">Noch keine Partie. Los geht’s!</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {view.matches.map((m) => {
              const winners = m.winner === 'A' ? m.sideA : m.sideB;
              const losers = m.winner === 'A' ? m.sideB : m.sideA;
              const editable = canWrite && !m.isTournament;
              return (
                <li key={m.id}>
                  <button
                    disabled={!editable}
                    onClick={() => setEntry({ initial: { a: m.sideA, b: m.sideB }, editing: m })}
                    className="flex w-full items-center justify-between gap-2 py-2 text-left"
                  >
                    <span>
                      <b>{label(winners)}</b> <span className="text-stone-500">schlägt</span> {label(losers)}
                      {m.isTournament && <span className="ml-1">🏆</span>}
                      <span className="block text-xs text-stone-400">
                        {time(m.createdAt)}
                        {m.createdByName && ` · eingetragen von ${m.createdByName}`}
                      </span>
                    </span>
                    {editable && <span className="text-stone-300">✎</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/s/${view.id}/tournament`} className="rounded-xl bg-white px-4 py-3 text-center font-semibold ring-1 ring-stone-300">
          🏆 Turnier
        </Link>
        {active && canEnd ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => confirm('Sitzung beenden? Danach kann nichts mehr eingetragen werden.') && act(() => endSession(view.id))}
          >
            Sitzung beenden
          </Button>
        ) : (
          <Link href={`/s/${view.id}/summary`} className="rounded-xl bg-white px-4 py-3 text-center font-semibold ring-1 ring-stone-300">
            Zusammenfassung
          </Link>
        )}
      </div>

      {entry && (
        <MatchEntry
          sessionId={view.id}
          players={view.players}
          initial={entry.initial}
          editing={entry.editing}
          onClose={() => setEntry(null)}
        />
      )}
    </div>
  );
}
