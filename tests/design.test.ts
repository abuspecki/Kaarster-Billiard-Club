import { describe, expect, it } from 'vitest';
import { AVATAR_PALETTE, FORM_FILL, avatarColor, groupInitials, initialOf } from '@/lib/design';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

describe('avatarColor', () => {
  it('is deterministic and from the palette', () => {
    expect(avatarColor('u:abc')).toBe(avatarColor('u:abc'));
    expect(AVATAR_PALETTE).toContain(avatarColor('u:abc'));
  });
  it('is grey for guests', () => {
    expect(avatarColor('g:x')).toBe('#6b7280');
  });
  it('spreads players across colors', () => {
    const colors = new Set(['u:1', 'u:2', 'u:3', 'u:4', 'u:5', 'u:6'].map(avatarColor));
    expect(colors.size).toBeGreaterThan(2);
  });
  it('palette has readable white text', () => {
    expect(AVATAR_PALETTE).toHaveLength(8);
    for (const c of AVATAR_PALETTE) expect(contrast(c, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('initials', () => {
  it('groupInitials', () => {
    expect(groupInitials('Kaarster Billiard Club')).toBe('KBC');
    expect(groupInitials('Billardfreunde')).toBe('BIL');
    expect(groupInitials('🎱 Die Kugeln')).toBe('DK');
    expect(groupInitials('🎱')).toBe('?');
    expect(groupInitials('a b c d')).toBe('ABC');
  });
  it('initialOf', () => {
    expect(initialOf('max')).toBe('M');
    expect(initialOf('')).toBe('?');
  });
});

describe('form box fills', () => {
  it('white letters on win/loss boxes are readable in both themes', () => {
    expect(contrast(FORM_FILL.W, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(FORM_FILL.L, '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });
});
