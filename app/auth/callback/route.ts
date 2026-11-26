import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { safeNext } from '@/lib/safe-next';

/** Bestätigungslink aus der Registrierungs-Mail: anmelden und zum ursprünglichen Ziel weiter. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next = safeNext(request.nextUrl.searchParams.get('next'));
  if (code) {
    const sb = await createServerSupabase();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }
  const login = new URL('/login', request.nextUrl.origin);
  login.searchParams.set('next', next);
  login.searchParams.set('confirmed', '1');
  return NextResponse.redirect(login);
}
