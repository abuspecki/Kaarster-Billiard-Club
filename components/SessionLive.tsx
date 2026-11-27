'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { addGuest, deleteMatch, endSession, joinSession, setPlayerPaused } from '@/app/actions/session';
import type { Sides } from '@/lib/match-entry';
import type { SessionMatch, SessionPlayer, SessionView } from '@/lib/session-data';
import { useRealtimeRefresh } from '@/lib/useRealtimeRefresh';
import { MatchEntry } from './MatchEntry';
import { ShareButton } from './ShareButton';
import { AppBar, LiveBadge, MutedBadge } from './sport/AppBar';
import { EmptyState } from './sport/EmptyState';
import { PlayerBadge } from './sport/PlayerBadge';
import { ResultCard } from './sport/ResultCard';
import { SectionCard } from './sport/SectionCard';
import { Toast } from './sport/Toast';
import { Button, ErrorText, Input } from './ui';

const time = (iso: string) => new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });
const keyOf = (p: SessionPlayer) => (p.userId ? `u:${p.userId}` : `g:${p.id}`);

export function SessionLive({ view, canEnd }: { view: SessionView; canEnd: boolean }) {
  useRealtimeRefresh(view.id);
  const [entry, setEntry] = useState<{ initial: Sides; editing?: SessionMatch } | null>(null);
  const [guestName, setGuestName] = useState('');
  const [showGuest, setShowGuest] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [toast, setToast] = useState<{ message: string | null; stamp: number; undoId?: string }>({ message: null, stamp: 0 });
  const [pending, start] = useTransition();

  const active = view.status === 'active';
  const canWrite = active && view.me.playerId !== null;
  const byId = (id: string) => view.players.find((p) => p.id === id);
  const side = (ids: string[], strong: boolean) => (
    <>
      <span className="flex shrink-0 -space-x-1.5">
        {ids.map((id) => {
          const p = byId(id);
          return p ? <PlayerBadge key={id} player={keyOf(p)} name={p.name} size="sm" /> : null;
        })}
      </span>
      <span className={`truncate ${strong ? '' : 'font-normal'}`}>{ids.map((id) => byId(id)?.name ?? '?').join(' + ')}</span>
    </>
  );
  const notify = (message: string, undoId?: string) => setToast((t) => ({ message, stamp: t.stamp + 1, undoId }));
  const undo = (matchId: string) =>
    act(async () => {
      const r = await deleteMatch(view.id, matchId);
      if (!r.error) notify('Rückgängig gemacht');
      return r;
    });

  const act = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      setError(r?.error);
    });

  return (
    <>
      <AppBar
        title={active ? 'Sitzung' : 'Sitzung beendet'}
        subtitle={`${view.groupName} · ${view.matches.length} ${view.matches.length === 1 ? 'Partie' : 'Partien'} · ${view.players.length} Spieler`}
        badge={active ? <LiveBadge /> : <MutedBadge label="BEENDET" />}
        back={{ href: `/g/${view.groupId}`, label: view.groupName }}
        right={
          active ? (
            <ShareButton
              url={`/join/${view.code}`}
              text={`Spiel mit! Code: ${view.code}`}
              title="Billiard-Sitzung"
              label={view.code}
              className="border-white/20! bg-white/10! px-3 py-2 font-mono text-bar-fg!"
            />
          ) : undefined
        }
      />

      <div className="space-y-3 p-4">
        <ErrorText>{error}</ErrorText>

        {!active && (
          <Link href={`/s/${view.id}/summary`} className="block rounded-xl bg-accent p-4 text-center font-extrabold text-white">
            Zum Spielbericht ›
          </Link>
        )}

        {active && view.me.playerId === null && (
          <Button className="w-full py-4 text-lg" disabled={pending} onClick={() => act(() => joinSession(view.id, view.code))}>
            Mitspielen
          </Button>
        )}

        {canWrite && (
          <Button className="w-full py-5 text-xl" onClick={() => setEntry({ initial: { a: view.me.playerId ? [view.me.playerId] : [], b: [] } })}>
            + Partie eintragen
          </Button>
        )}

        <SectionCard title={`Partien (${view.matches.length})`} flush>
          {view.matches.length === 0 ? (
            <EmptyState title="Noch keine Partie" text={canWrite ? 'Tippe auf „+ Partie eintragen“, sobald das erste Spiel vorbei ist.' : undefined} />
          ) : (
            <div className="divide-y divide-line">
              {view.matches.map((m) => {
                const winners = m.winner === 'A' ? m.sideA : m.sideB;
                const losers = m.winner === 'A' ? m.sideB : m.sideA;
                const editable = canWrite && !m.isTournament;
                return (
                  <ResultCard
                    key={m.id}
                    winner={side(winners, true)}
                    loser={side(losers, false)}
                    meta={`${time(m.createdAt)}${m.createdByName ? ` · eingetragen von ${m.createdByName}` : ''}`}
                    tag={m.isTournament ? 'Turnier' : undefined}
                    trailing={editable ? <span aria-hidden>✎</span> : undefined}
                    onClick={editable ? () => setEntry({ initial: { a: m.sideA, b: m.sideB }, editing: m }) : undefined}
                  />
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title={`Spieler (${view.players.length})`} action={canWrite ? <button onClick={() => setShowGuest((v) => !v)}>+ Gast</button> : undefined}>
          <div className="flex flex-wrap gap-2">
            {view.players.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={!canWrite}
                onClick={() => setMenuFor((cur) => (cur === p.id ? null : p.id))}
                className={`flex max-w-full items-center gap-1.5 rounded-full border-2 py-1 pr-3 pl-1 text-sm font-semibold transition ${
                  menuFor === p.id ? 'border-accent' : 'border-transparent'
                } ${p.paused ? 'bg-surface-2 opacity-55' : 'bg-surface-2'}`}
              >
                <PlayerBadge player={keyOf(p)} name={p.name} size="sm" />
                <span className="truncate">{p.name}</span>
                {p.isGuest && <span className="text-xs font-normal text-muted">Gast</span>}
                {p.paused && <span className="rounded bg-line px-1 text-[10px] font-black tracking-wide text-muted">⏸ PAUSE</span>}
              </button>
            ))}
          </div>
          {menuFor &&
            (() => {
              const p = view.players.find((x) => x.id === menuFor);
              if (!p) return null;
              return (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
                  <span className="min-w-0 flex-1 truncate pl-1 text-sm font-semibold">{p.name}</span>
                  <Button
                    variant={p.paused ? 'primary' : 'secondary'}
                    disabled={pending}
                    className="px-3 py-2 text-sm"
                    onClick={() =>
                      act(async () => {
                        const r = await setPlayerPaused(view.id, p.id, !p.paused);
                        if (!r.error) {
                          setMenuFor(null);
                          notify(p.paused ? `${p.name} ist zurück ✓` : `${p.name} macht Pause ⏸`);
                        }
                        return r;
                      })
                    }
                  >
                    {p.paused ? '▶ Zurück' : '⏸ Pause'}
                  </Button>
                  <button className="px-2 text-sm font-semibold text-muted" onClick={() => setMenuFor(null)}>
                    Abbrechen
                  </button>
                </div>
              );
            })()}
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
                    notify('Gast hinzugefügt ✓');
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
          <p className="mt-3 text-xs text-muted">Spieler antippen, um ihn auf Pause zu setzen. Gäste zählen heute mit, aber nicht in der Gruppen-Tabelle.</p>
        </SectionCard>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/s/${view.id}/tournament`}
            className="shadow-card rounded-lg border border-line bg-surface px-4 py-3 text-center font-bold hover:bg-surface-2"
          >
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
            <Link
              href={`/s/${view.id}/summary`}
              className="shadow-card rounded-lg border border-line bg-surface px-4 py-3 text-center font-bold hover:bg-surface-2"
            >
              Spielbericht
            </Link>
          )}
        </div>
      </div>

      {entry && (
        <MatchEntry
          sessionId={view.id}
          players={view.players}
          initial={entry.initial}
          editing={entry.editing}
          onClose={() => setEntry(null)}
          onSaved={notify}
        />
      )}
      <Toast
        message={toast.message}
        stamp={toast.stamp}
        action={toast.undoId ? { label: 'Rückgängig', onClick: () => undo(toast.undoId!) } : undefined}
      />
    </>
  );
}
