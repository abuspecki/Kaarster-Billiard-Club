import { expect, it } from 'vitest';
import { generateBracket } from '@/lib/bracket';
import { matchLabel } from '@/lib/tournament-view';

it('labels rounds for single and double elimination', () => {
  const single = generateBracket(8);
  expect(matchLabel(single.find((m) => m.id === 'r1-s0')!, single)).toBe('Viertelfinale');
  expect(matchLabel(single.find((m) => m.id === 'r3-s0')!, single)).toBe('Finale');
  const double = generateBracket(4, 'double');
  expect(matchLabel(double.find((m) => m.id === 'W1-0')!, double)).toBe('Gewinnerrunde 1');
  expect(matchLabel(double.find((m) => m.id === 'L2-0')!, double)).toBe('Verliererrunde 2');
  expect(matchLabel(double.find((m) => m.id === 'F')!, double)).toBe('Finale');
});
