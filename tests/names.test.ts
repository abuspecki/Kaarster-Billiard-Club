import { expect, it } from 'vitest';
import { displayName, FORMER_MEMBER } from '@/lib/names';

it('uses the known name', () => {
  expect(displayName({ 'u:a': 'Max' }, 'u:a')).toBe('Max');
});

it('falls back for removed members and guests', () => {
  expect(displayName({}, 'u:gone')).toBe(FORMER_MEMBER);
  expect(FORMER_MEMBER).toBe('Ehemaliges Mitglied');
  expect(displayName({}, 'g:x')).toBe('Gast');
});
