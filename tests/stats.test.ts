import { describe, expect, it } from 'vitest';
import { computeStandings, headToHead, longestStreak } from '@/lib/stats';
import type { MatchRecord, PlayerKey } from '@/lib/types';

let n = 0;
function m(sideA: PlayerKey[], sideB: PlayerKey[], winner: 'A' | 'B' = 'A'): MatchRecord {
  n++;
  return { id: `m${n}`, playedAt: new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString(), sideA, sideB, winner };
}

describe('computeStandings', () => {
  it('counts singles and team results separately', () => {
    const s = computeStandings([m(['u:a'], ['u:b']), m(['u:a', 'u:c'], ['u:b', 'u:d'])]);
    const a = s.find((x) => x.player === 'u:a')!;
    const b = s.find((x) => x.player === 'u:b')!;
    expect(a).toMatchObject({ wins: 2, losses: 0, played: 2, winRate: 1, singlesWins: 1, teamWins: 1 });
    expect(b).toMatchObject({ wins: 0, losses: 2, singlesLosses: 1, teamLosses: 1 });
  });

  it('sorts by wins, then winRate, then fewer played', () => {
    const matches = [
      m(['u:x'], ['u:w']),
      m(['u:x'], ['u:w']),
      m(['u:y'], ['u:w']),
      m(['u:y'], ['u:v']),
      m(['u:y'], ['u:z'], 'B'),
    ];
    // x 2/0, y 2/1, z 1/0, v 0/1, w 0/3
    expect(computeStandings(matches).map((s) => s.player)).toEqual(['u:x', 'u:y', 'u:z', 'u:v', 'u:w']);
  });

  it('excludes guests but credits their partner', () => {
    const matches = [m(['u:a', 'g:1'], ['u:b', 'u:c'])];
    const s = computeStandings(matches);
    expect(s.some((x) => x.player.startsWith('g:'))).toBe(false);
    expect(s.find((x) => x.player === 'u:a')!.wins).toBe(1);
    expect(computeStandings(matches, { includeGuests: true }).some((x) => x.player === 'g:1')).toBe(true);
  });
});

describe('headToHead', () => {
  it('counts only opposite sides', () => {
    const matches = [
      m(['u:a'], ['u:b']),
      m(['u:a'], ['u:b']),
      m(['u:a'], ['u:b'], 'B'),
      m(['u:a', 'u:b'], ['u:c']),
    ];
    expect(headToHead(matches, 'u:a', 'u:b')).toEqual({ aWins: 2, bWins: 1 });
  });
});

describe('longestStreak', () => {
  it('finds the longest win streak', () => {
    const matches = [
      m(['u:a'], ['u:c']),
      m(['u:a'], ['u:c']),
      m(['u:a'], ['u:c']),
      m(['u:a'], ['u:c'], 'B'),
      m(['u:a'], ['u:c']),
      m(['u:b'], ['u:c']),
      m(['u:b'], ['u:c']),
    ];
    expect(longestStreak(matches)).toEqual({ player: 'u:a', length: 3 });
  });

  it('is independent of input order', () => {
    const matches = [m(['u:a'], ['u:c']), m(['u:a'], ['u:c']), m(['u:a'], ['u:c'], 'B')];
    expect(longestStreak([...matches].reverse())).toEqual({ player: 'u:a', length: 2 });
  });

  it('returns null without matches', () => {
    expect(longestStreak([])).toBeNull();
  });
});
