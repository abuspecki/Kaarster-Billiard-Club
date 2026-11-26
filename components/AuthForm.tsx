'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, register, type FormState } from '@/app/actions/auth';
import { Button, ErrorText, InfoText, Input } from './ui';

export function AuthForm({ mode, next, notice }: { mode: 'login' | 'register'; next: string; notice?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === 'login' ? login : register, {});
  const other = mode === 'login' ? '/register' : '/login';
  return (
    <div className="min-h-dvh">
      <div className="bg-bar px-5 pt-14 pb-16 text-bar-fg">
        <div className="font-cond grid h-14 w-14 place-items-center rounded-xl bg-accent text-2xl font-extrabold tracking-wide">BT</div>
        <h1 className="font-cond mt-4 text-4xl leading-none font-extrabold uppercase">Billiard-Tracker</h1>
        <p className="mt-2 text-sm text-bar-muted">Sitzungen, Turniere und eure Tabelle – live auf jedem Handy.</p>
      </div>
      <div className="-mt-8 px-4">
        <section className="shadow-card rounded-xl border border-line bg-surface p-4">
          <h2 className="font-cond mb-3 text-xl font-extrabold uppercase">{mode === 'login' ? 'Anmelden' : 'Konto anlegen'}</h2>
          {notice && (
            <div className="mb-3">
              <InfoText>{notice}</InfoText>
            </div>
          )}
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
            <InfoText>{state.info}</InfoText>
            <Button type="submit" disabled={pending} className="w-full">
              {mode === 'login' ? 'Anmelden' : 'Registrieren'}
            </Button>
          </form>
        </section>
        <p className="mt-4 text-center text-sm text-muted">
          {mode === 'login' ? 'Noch kein Konto? ' : 'Schon ein Konto? '}
          <Link className="font-bold text-accent-text" href={`${other}?next=${encodeURIComponent(next)}`}>
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </Link>
        </p>
      </div>
    </div>
  );
}
