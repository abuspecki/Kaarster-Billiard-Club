import { describe, expect, it } from 'vitest';
import { dayLabel, lastEvening, parseTab, stripItems } from '@/lib/group-view';
import type { MatchRecord } from '@/lib/types';

const m = (id: string, at: string, a: string[], b: string[], w: 'A' | 'B' = 'A'): MatchRecord => ({ id, playedAt: at, sideA: a, sideB: b, winner: w });
const names = { 'u:max': 'Max', 'u:lea': 'Lea', 'u:tim': 'Tim', 'g:1': 'Gast Tom' };

describe('parseTab', () => {
  it('accepts known tabs and falls back to overview', () => {
    expect(parseTab('tabelle')).toBe('tabelle');
    expect(parseTab('spieler')).toBe('spieler');
    expect(parseTab('x')).toBe('uebersicht');
    expect(parseTab(undefined)).toBe('uebersicht');
  });
});

describe('stripItems', () => {
  const ms = [
    m('1', '2026-11-26T19:00:00Z', ['u:max'], ['u:lea']),
    m('2', '2026-11-26T20:14:00Z', ['u:max', 'u:lea'], ['u:tim', 'g:1'], 'B'),
  ];
  it('lists newest first with winner/loser names and Berlin time', () => {
    const items = stripItems(ms, names, new Set(['2']));
    expect(items[0]).toMatchObject({ id: '2', winner: 'Tim + Gast Tom', loser: 'Max + Lea', time: '21:14', live: true });
    expect(items[1]).toMatchObject({ id: '1', winner: 'Max', loser: 'Lea', live: false });
  });
  it('respects the limit', () => {
    expect(stripItems(ms, names, new Set(), 1)).toHaveLength(1);
  });
});

describe('lastEvening', () => {
  it('skips the newest session without matches', () => {
    const sessions = [
      { id: 'new', created_at: '2026-11-26T18:00:00Z' },
      { id: 'old', created_at: '2026-11-20T18:00:00Z' },
    ];
    const by = new Map([['old', [m('1', '2026-11-20T19:00:00Z', ['u:max'], ['u:lea'])]]]);
    expect(lastEvening(sessions, by)?.sessionId).toBe('old');
    expect(lastEvening(sessions, new Map())).toBeNull();
  });
});

describe('dayLabel', () => {
  const now = new Date('2026-11-26T22:30:00Z'); // 23:30 in Berlin
  it('says HEUTE for matches of the same Berlin day', () => {
    expect(dayLabel('2026-11-26T20:14:00Z', now)).toBe('HEUTE');
  });
  it('uses a short date for older matches', () => {
    expect(dayLabel('2026-11-20T20:14:00Z', now)).toBe('20.11.');
  });
  it('uses the Berlin day, not UTC', () => {
    expect(dayLabel('2026-11-25T23:30:00Z', now)).toBe('HEUTE'); // 00:30 Berlin am 26.
  });
});

describe('stripItems day', () => {
  it('labels each item with its day', () => {
    const items = stripItems([m('1', '2026-11-20T19:00:00Z', ['u:max'], ['u:lea'])], names, new Set(['1']), 10, new Date('2026-11-26T20:00:00Z'));
    expect(items[0].day).toBe('20.11.');
  });
});
