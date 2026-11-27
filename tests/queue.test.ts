import { describe, expect, it } from 'vitest';
import { generateBracket, setWinner } from '@/lib/bracket';
import { nowAndNext, pausedTeamIndexes, playQueue } from '@/lib/queue';

describe('playQueue', () => {
  it('double 4: first round, then losers before winners', () => {
    let b = generateBracket(4, 'double');
    expect(nowAndNext(b).now?.id).toBe('W1-0');
    expect(nowAndNext(b).next?.id).toBe('W1-1');
    b = setWinner(b, 'W1-0', 0);
    b = setWinner(b, 'W1-1', 1);
    expect(playQueue(b).map((m) => m.id)).toEqual(['L1-0', 'W2-0']);
  });

  it('skips matches of paused teams', () => {
    let b = generateBracket(4, 'double');
    b = setWinner(b, 'W1-0', 0);
    b = setWinner(b, 'W1-1', 1);
    const q = nowAndNext(b, new Set([3]));
    expect(q.now?.id).toBe('W2-0');
    expect(q.next).toBeNull();
    expect(q.paused.map((m) => m.id)).toEqual(['L1-0']);
  });

  it('single elimination order', () => {
    expect(playQueue(generateBracket(4)).map((m) => m.id)).toEqual(['r1-s0', 'r1-s1']);
  });

  it('final comes last and finished tournament has nothing', () => {
    let b = generateBracket(2, 'double');
    b = setWinner(b, 'W1-0', 0);
    expect(nowAndNext(b).now?.id).toBe('F');
    b = setWinner(b, 'F', 0);
    expect(nowAndNext(b).now).toBeNull();
  });

  it('never queues byes', () => {
    expect(playQueue(generateBracket(5, 'double')).every((m) => !m.isBye && m.teamA !== null && m.teamB !== null)).toBe(true);
  });
});

describe('pausedTeamIndexes', () => {
  it('marks a team as paused when one of its players is paused', () => {
    expect(pausedTeamIndexes([['a'], ['b', 'c']], new Set(['c']))).toEqual(new Set([1]));
  });
});
