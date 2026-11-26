import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { getUser } from '@/lib/supabase/server';

export async function Header() {
  const user = await getUser();
  if (!user) return null;
  return (
    <header className="flex items-center justify-between py-4">
      <Link href="/" className="text-lg font-bold">
        🎱 Billiard-Tracker
      </Link>
      <form action={logout} className="flex items-center gap-3 text-sm text-stone-600">
        <span className="max-w-32 truncate">{user.displayName}</span>
        <button className="font-semibold text-emerald-700">Abmelden</button>
      </form>
    </header>
  );
}
