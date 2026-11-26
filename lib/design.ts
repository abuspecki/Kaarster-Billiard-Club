import type { PlayerKey } from './types';

/** Abzeichenfarben – alle mit weißem Text gut lesbar (≥ 4,5:1). */
export const AVATAR_PALETTE = [
  '#b45309', // bernstein
  '#1d4ed8', // blau
  '#b91c1c', // rot
  '#6d28d9', // violett
  '#047857', // grün
  '#be185d', // pink
  '#0e7490', // petrol
  '#4d7c0f', // oliv
] as const;

export const GUEST_COLOR = '#6b7280';

export function avatarColor(player: PlayerKey): string {
  if (player.startsWith('g:')) return GUEST_COLOR;
  let hash = 0;
  for (let i = 0; i < player.length; i++) hash = (hash * 31 + player.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

const LETTER = /[\p{L}\p{N}]/u;

export function initialOf(name: string): string {
  const ch = [...name].find((c) => LETTER.test(c));
  return ch ? ch.toUpperCase() : '?';
}

export function groupInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => [...w].filter((c) => LETTER.test(c)).join(''))
    .filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => [...w][0])
    .join('')
    .toUpperCase();
}

/** Füllfarben der großen Form-Kästchen (mit weißer Schrift) – in hell und dunkel gleich. */
export const FORM_FILL = { W: '#15803d', L: '#b91c1c' } as const;
