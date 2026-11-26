import { describe, expect, it } from 'vitest';
import { drawTeams } from '@/lib/teams';

function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('drawTeams', () => {
  it('deals leftover players', () => {
    const players = ['u:a', 'u:b', 'u:c', 'u:d', 'u:e'];
    const teams = drawTeams(players, 2);
    expect(teams.map((t) => t.length)).toEqual([2, 2, 1]);
    expect(teams.flat().sort()).toEqual(players);
  });

  it('is deterministic with rng', () => {
    const players = ['u:a', 'u:b', 'u:c', 'u:d'];
    expect(drawTeams(players, 2, seq([0.1, 0.7, 0.3]))).toEqual(drawTeams(players, 2, seq([0.1, 0.7, 0.3])));
  });

  it('throws when only one team', () => {
    expect(() => drawTeams(['u:a', 'u:b'], 2)).toThrow();
  });

  it('throws for team size below 1', () => {
    expect(() => drawTeams(['u:a', 'u:b'], 0)).toThrow();
  });
});
