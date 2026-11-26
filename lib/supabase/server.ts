import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // In Server Components nicht erlaubt – die Middleware aktualisiert die Sitzung.
        }
      },
    },
  });
}

export async function getUser(): Promise<{ id: string; displayName: string } | null> {
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  // Name kommt aus den Konto-Daten (bei der Registrierung gesetzt) – spart eine Datenbank-Anfrage pro Seite.
  const meta = data.user.user_metadata as { display_name?: string } | undefined;
  return { id: data.user.id, displayName: meta?.display_name?.trim() || 'Spieler' };
}

export async function requireUser(): Promise<{ id: string; displayName: string }> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}
