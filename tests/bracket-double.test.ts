import { describe, expect, it } from 'vitest';
import { bracketFormat, canChangeResult, champion, generateBracket, setWinner, type BracketMatch } from '@/lib/bracket';

const find = (b: BracketMatch[], id: string) => b.find((m) => m.id === id)!;
const playable = (b: BracketMatch[]) => b.filter((m) => !m.isBye && m.winner === null && m.teamA !== null && m.teamB !== null);

/** Spielt ein Turnier mit deterministischem Zufall komplett durch. */
function playOut(teams: number, seed: number) {
  let b = generateBracket(teams, 'double');
  let x = seed;
  const rnd = () => ((x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const losses = new Map<number, number>();
  let games = 0;
  for (let guard = 0; guard < 200; guard++) {
    const p = playable(b);
    if (p.length === 0) break;
    const m = p[0];
    const winner = rnd() < 0.5 ? m.teamA! : m.teamB!;
    const loser = winner === m.teamA ? m.teamB! : m.teamA!;
    losses.set(loser, (losses.get(loser) ?? 0) + 1);
    b = setWinner(b, m.id, winner);
    games++;
  }
  return { b, losses, games };
}

describe('double elimination', () => {
  it('4 teams', () => {
    let b = generateBracket(4, 'double');
    expect(b.map((m) => m.id).sort()).toEqual(['F', 'L1-0', 'L2-0', 'W1-0', 'W1-1', 'W2-0']);
    b = setWinner(b, 'W1-0', 0);
    b = setWinner(b, 'W1-1', 1);
    expect(find(b, 'L1-0')).toMatchObject({ teamA: 3, teamB: 2 });
    b = setWinner(b, 'W2-0', 0);
    b = setWinner(b, 'L1-0', 2);
    expect(find(b, 'L2-0')).toMatchObject({ teamA: 2, teamB: 1 });
    b = setWinner(b, 'L2-0', 1);
    expect(find(b, 'F')).toMatchObject({ teamA: 0, teamB: 1 });
    expect(champion(b)).toBeNull();
    b = setWinner(b, 'F', 1);
    expect(champion(b)).toBe(1);
  });

  it('2 teams: final is a rematch of winner and loser', () => {
    let b = generateBracket(2, 'double');
    expect(b.map((m) => m.id)).toEqual(['W1-0', 'F']);
    b = setWinner(b, 'W1-0', 1);
    expect(find(b, 'F')).toMatchObject({ teamA: 1, teamB: 0 });
  });

  for (const n of [3, 5, 6, 7]) {
    it(`double ${n} teams has no playable match against nobody`, () => {
      for (const seed of [1, 7, 42, 99]) {
        const { b, losses } = playOut(n, seed);
        expect(champion(b)).not.toBeNull();
        for (const m of b) if (!m.isBye && m.winner !== null) expect(m.teamA !== null && m.teamB !== null).toBe(true);
        for (const [, l] of losses) expect(l).toBeLessThanOrEqual(2);
        // alle außer Champion (und ggf. Finalist) sind zweimal raus
        const champ = champion(b)!;
        expect(losses.get(champ) ?? 0).toBeLessThanOrEqual(1);
      }
    });
  }

  it('double 8 teams plays 2n-2 games', () => {
    const { b, games } = playOut(8, 5);
    expect(champion(b)).not.toBeNull();
    expect(games).toBe(14);
  });

  it('locks result when loser path decided', () => {
    let b = generateBracket(4, 'double');
    b = setWinner(b, 'W1-0', 0);
    b = setWinner(b, 'W1-1', 1);
    b = setWinner(b, 'L1-0', 2);
    expect(canChangeResult(b, 'W1-0')).toBe(false);
    expect(() => setWinner(b, 'W1-0', 3)).toThrow();
  });

  it('bracketFormat', () => {
    expect(bracketFormat(generateBracket(4, 'double'))).toBe('double');
    expect(bracketFormat(generateBracket(4))).toBe('single');
  });
});
