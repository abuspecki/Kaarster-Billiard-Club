import type { StripItem } from '@/components/sport/ResultStrip';
import { displayName } from './names';
import type { MatchRecord, PlayerKey } from './types';

export const GROUP_TABS = ['uebersicht', 'tabelle', 'turniere', 'spieler'] as const;
export type GroupTab = (typeof GROUP_TABS)[number];

export function parseTab(v: unknown): GroupTab {
  return (GROUP_TABS as readonly unknown[]).includes(v) ? (v as GroupTab) : 'uebersicht';
}

export const berlinTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' });

const berlinDay = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });

/** „HEUTE“ für Partien vom selben Tag (Berliner Zeit), sonst „TT.MM.“. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (berlinDay(d) === berlinDay(now)) return 'HEUTE';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Berlin' });
}

export function stripItems(
  matches: MatchRecord[],
  names: Record<PlayerKey, string>,
  liveMatchIds: Set<string>,
  limit = 10,
  now: Date = new Date(),
): StripItem[] {
  const label = (keys: PlayerKey[]) => keys.map((k) => displayName(names, k)).join(' + ');
  return [...matches]
    .sort((a, b) => b.playedAt.localeCompare(a.playedAt) || b.id.localeCompare(a.id))
    .slice(0, limit)
    .map((match) => ({
      id: match.id,
      winner: label(match.winner === 'A' ? match.sideA : match.sideB),
      loser: label(match.winner === 'A' ? match.sideB : match.sideA),
      time: berlinTime(match.playedAt),
      day: dayLabel(match.playedAt, now),
      live: liveMatchIds.has(match.id),
    }));
}

export function lastEvening(
  sessions: { id: string; created_at: string }[],
  matchesBySession: Map<string, MatchRecord[]>,
): { sessionId: string; matches: MatchRecord[] } | null {
  const sorted = [...sessions].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const s of sorted) {
    const matches = matchesBySession.get(s.id);
    if (matches && matches.length > 0) return { sessionId: s.id, matches };
  }
  return null;
}
