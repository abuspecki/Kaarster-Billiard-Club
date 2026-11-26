'use server';

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

export type FormState = { error?: string; info?: string };

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const sb = await createServerSupabase();
  const { error } = await sb.auth.signInWithPassword({
    email: String(form.get('email') ?? '').trim(),
    password: String(form.get('password') ?? ''),
  });
  if (error) return { error: 'E-Mail oder Passwort falsch.' };
  redirect(safeNext(form.get('next')));
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const displayName = String(form.get('displayName') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (displayName.length < 1 || displayName.length > 40) return { error: 'Name muss 1 bis 40 Zeichen haben.' };
  if (password.length < 8) return { error: 'Passwort muss mindestens 8 Zeichen haben.' };

  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signUp({
    email: String(form.get('email') ?? '').trim(),
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: error.message.includes('registered') ? 'Diese E-Mail ist schon registriert.' : 'Registrierung fehlgeschlagen.' };
  if (!data.session) return { info: 'Fast geschafft! Bestätige deine E-Mail über den Link, den wir dir geschickt haben.' };
  redirect(safeNext(form.get('next')));
}

export async function logout() {
  const sb = await createServerSupabase();
  await sb.auth.signOut();
  redirect('/login');
}
