import { describe, expect, it } from 'vitest';
import { isComplete, resize, togglePlayer } from '@/lib/match-entry';

describe('togglePlayer', () => {
  it('fills side A first, then side B', () => {
    let s = togglePlayer({ a: [], b: [] }, 'p1', 1);
    s = togglePlayer(s, 'p2', 1);
    expect(s).toEqual({ a: ['p1'], b: ['p2'] });
  });

  it('removes a selected player', () => {
    expect(togglePlayer({ a: ['p1'], b: ['p2'] }, 'p1', 1)).toEqual({ a: [], b: ['p2'] });
  });

  it('refills the free spot on side A after removal', () => {
    expect(togglePlayer({ a: [], b: ['p2'] }, 'p3', 1)).toEqual({ a: ['p3'], b: ['p2'] });
  });

  it('ignores taps when both sides are full', () => {
    expect(togglePlayer({ a: ['p1'], b: ['p2'] }, 'p3', 1)).toEqual({ a: ['p1'], b: ['p2'] });
  });
});

describe('resize / isComplete', () => {
  it('trims sides when switching to singles', () => {
    expect(resize({ a: ['p1', 'p2'], b: ['p3', 'p4'] }, 1)).toEqual({ a: ['p1'], b: ['p3'] });
  });

  it('is complete only with full sides', () => {
    expect(isComplete({ a: ['p1'], b: ['p2'] }, 1)).toBe(true);
    expect(isComplete({ a: ['p1'], b: ['p2'] }, 2)).toBe(false);
  });
});

describe('orderForEntry', () => {
  it('puts paused players last and keeps the order otherwise', async () => {
    const { orderForEntry } = await import('@/lib/match-entry');
    const ps = [
      { id: 'a', paused: true },
      { id: 'b', paused: false },
      { id: 'c', paused: true },
      { id: 'd', paused: false },
    ];
    expect(orderForEntry(ps).map((p) => p.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('keeps everyone when all are paused', async () => {
    const { orderForEntry } = await import('@/lib/match-entry');
    const ps = [
      { id: 'a', paused: true },
      { id: 'b', paused: true },
    ];
    expect(orderForEntry(ps).map((p) => p.id)).toEqual(['a', 'b']);
  });
});
