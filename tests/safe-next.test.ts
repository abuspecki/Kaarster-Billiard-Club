import { expect, it } from 'vitest';
import { safeNext } from '@/lib/safe-next';

it('allows internal paths only', () => {
  expect(safeNext('/join/ABC123')).toBe('/join/ABC123');
  expect(safeNext('//evil.com')).toBe('/');
  expect(safeNext('https://evil.com')).toBe('/');
  expect(safeNext(null)).toBe('/');
});
