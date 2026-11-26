import type { PlayerKey } from './types';

export const FORMER_MEMBER = 'Ehemaliges Mitglied';

export const displayName = (names: Record<PlayerKey, string>, key: PlayerKey) =>
  names[key] ?? (key.startsWith('g:') ? 'Gast' : FORMER_MEMBER);
