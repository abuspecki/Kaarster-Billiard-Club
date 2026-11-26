import { describe, expect, it } from 'vitest';
import { BracketError, canChangeResult, champion, generateBracket, setWinner } from '@/lib/bracket';
import type { BracketMatch } from '@/lib/bracket';

const find = (b: BracketMatch[], id: string) => b.find((m) => m.id === id)!;

describe('generateBracket', () => {
  it('4 teams', () => {
    const b = generateBracket(4);
    expect(b).toHaveLength(3);
    expect(find(b, 'r1-s0')).toMatchObject({ teamA: 0, teamB: 3, isBye: false, winner: null });
    expect(find(b, 'r1-s1')).toMatchObject({ teamA: 1, teamB: 2 });
    expect(find(b, 'r2-s0')).toMatchObject({ teamA: null, teamB: null });
  });

  it('5 teams with byes', () => {
    const b = generateBracket(5);
    expect(b).toHaveLength(7);
    expect(find(b, 'r1-s0')).toMatchObject({ isBye: true, winner: 0 });
    expect(find(b, 'r1-s1')).toMatchObject({ teamA: 3, teamB: 4, isBye: false });
    expect(find(b, 'r1-s2')).toMatchObject({ isBye: true, winner: 1 });
    expect(find(b, 'r1-s3')).toMatchObject({ isBye: true, winner: 2 });
    expect(find(b, 'r2-s0')).toMatchObject({ teamA: 0, teamB: null });
    expect(find(b, 'r2-s1')).toMatchObject({ teamA: 1, teamB: 2 });
  });

  it('2 teams', () => {
    const b = generateBracket(2);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ id: 'r1-s0', teamA: 0, teamB: 1 });
  });

  it('throws for fewer than 2 teams', () => {
    expect(() => generateBracket(1)).toThrow(BracketError);
  });
});

describe('setWinner', () => {
  it('advances winner', () => {
    const b = setWinner(generateBracket(4), 'r1-s0', 3);
    expect(find(b, 'r1-s0').winner).toBe(3);
    expect(find(b, 'r2-s0').teamA).toBe(3);
  });

  it('does not mutate the input', () => {
    const b = generateBracket(4);
    setWinner(b, 'r1-s0', 3);
    expect(find(b, 'r1-s0').winner).toBeNull();
  });

  it('correction replaces advanced team', () => {
    let b = setWinner(generateBracket(4), 'r1-s0', 3);
    b = setWinner(b, 'r1-s0', 0);
    expect(find(b, 'r2-s0').teamA).toBe(0);
  });

  it('rejects change when next match decided', () => {
    let b = generateBracket(4);
    b = setWinner(b, 'r1-s0', 0);
    b = setWinner(b, 'r1-s1', 1);
    b = setWinner(b, 'r2-s0', 1);
    expect(canChangeResult(b, 'r1-s0')).toBe(false);
    expect(canChangeResult(b, 'r2-s0')).toBe(true);
    expect(() => setWinner(b, 'r1-s0', 3)).toThrow(BracketError);
  });

  it('rejects team not in match', () => {
    expect(() => setWinner(generateBracket(4), 'r1-s0', 1)).toThrow(BracketError);
  });

  it('rejects match without both teams', () => {
    expect(() => setWinner(generateBracket(4), 'r2-s0', 0)).toThrow(BracketError);
  });

  it('rejects setting a bye', () => {
    expect(() => setWinner(generateBracket(5), 'r1-s0', 0)).toThrow(BracketError);
    expect(canChangeResult(generateBracket(5), 'r1-s0')).toBe(false);
  });
});

describe('champion', () => {
  it('is the final winner, else null', () => {
    let b = generateBracket(2);
    expect(champion(b)).toBeNull();
    b = setWinner(b, 'r1-s0', 1);
    expect(champion(b)).toBe(1);
  });
});
