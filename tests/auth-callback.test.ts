import { expect, it } from 'vitest';
import { callbackUrl } from '@/lib/safe-next';

it('builds the e-mail confirmation callback with the original target', () => {
  expect(callbackUrl('https://bt.vercel.app', '/join/ABCDEFGH')).toBe('https://bt.vercel.app/auth/callback?next=%2Fjoin%2FABCDEFGH');
});

it('drops unsafe targets', () => {
  expect(callbackUrl('https://bt.vercel.app', '//evil.com')).toBe('https://bt.vercel.app/auth/callback?next=%2F');
});
