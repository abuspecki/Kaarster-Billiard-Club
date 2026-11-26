import { describe, expect, it } from 'vitest';
import { formatSummaryText, sessionSummary } from '@/lib/summary';
import type { MatchRecord } from '@/lib/types';

const ms: MatchRecord[] = [
  { id: '1', playedAt: '2026-11-26T19:00:00Z', sideA: ['g:1'], sideB: ['u:a'], winner: 'A' },
  { id: '2', playedAt: '2026-11-26T19:10:00Z', sideA: ['g:1'], sideB: ['u:b'], winner: 'A' },
  { id: '3', playedAt: '2026-11-26T19:20:00Z', sideA: ['u:a'], sideB: ['u:b'], winner: 'A' },
];

describe('sessionSummary', () => {
  it('picks player of the night and includes guests', () => {
    const s = sessionSummary(ms);
    expect(s.playerOfNight).toBe('g:1');
    expect(s.longestStreak).toEqual({ player: 'g:1', length: 2 });
    expect(s.standings.map((x) => x.player)).toContain('g:1');
  });

  it('has no player of the night without matches', () => {
    expect(sessionSummary([]).playerOfNight).toBeNull();
  });
});

describe('formatSummaryText', () => {
  it('contains group, date, player of the night and per-player lines', () => {
    const names = { 'g:1': 'Tom', 'u:a': 'Max', 'u:b': 'Lea' };
    const text = formatSummaryText(sessionSummary(ms), names, 'Kaarster Billiard Club', new Date('2026-11-26T20:00:00Z'), 'Tom');
    expect(text).toContain('Kaarster Billiard Club');
    expect(text).toContain('26.11.2026');
    expect(text).toContain('🏆 Spieler des Abends: Tom');
    expect(text).toContain('Tom: 2 Siege / 0 Niederlagen');
    expect(text).toContain('Max: 1 Sieg / 1 Niederlage');
    expect(text).toContain('Turniersieger: Tom');
  });
});
