'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, type FormState } from '@/app/actions/auth';
import { Button, Card, ErrorText, Input } from './ui';

export function AuthForm({ mode, next, notice }: { mode: 'login' | 'register'; next: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === 'login' ? login : register, {});
  const other = mode === 'login' ? '/register' : '/login';
  return (
    <div className="pt-10">
      <h1 className="mb-1 text-3xl font-bold">🎱 Billiard-Tracker</h1>
      <p className="mb-6 text-stone-600">{mode === 'login' ? 'Willkommen zurück!' : 'Konto anlegen – dauert 20 Sekunden.'}</p>
      <Card>
        {notice && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        <form action={action} className="space-y-3">
          <input type="hidden" name="next" value={next} />
          {mode === 'register' && (
            <Input name="displayName" placeholder="Dein Name (wie andere dich sehen)" required maxLength={40} autoComplete="nickname" />
          )}
          <Input name="email" type="email" placeholder="E-Mail" required autoComplete="email" />
          <Input
            name="password"
            type="password"
            placeholder="Passwort"
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <ErrorText>{state.error}</ErrorText>
          {state.info && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.info}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {mode === 'login' ? 'Anmelden' : 'Registrieren'}
          </Button>
        </form>
      </Card>
      <p className="mt-4 text-center text-sm text-stone-600">
        {mode === 'login' ? 'Noch kein Konto? ' : 'Schon ein Konto? '}
        <Link className="font-semibold text-emerald-700" href={`${other}?next=${encodeURIComponent(next)}`}>
          {mode === 'login' ? 'Registrieren' : 'Anmelden'}
        </Link>
      </p>
    </div>
  );
}
