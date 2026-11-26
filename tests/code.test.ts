import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, generateCode } from '@/lib/code';

describe('generateCode', () => {
  it('has the requested length and only alphabet characters', () => {
    const code = generateCode(6);
    expect(code).toHaveLength(6);
    for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
  });

  it('uses the rng', () => {
    expect(generateCode(8, () => 0)).toBe('AAAAAAAA');
  });

  it('alphabet has no ambiguous characters', () => {
    for (const ch of ['0', 'O', '1', 'I']) expect(CODE_ALPHABET).not.toContain(ch);
  });
});
