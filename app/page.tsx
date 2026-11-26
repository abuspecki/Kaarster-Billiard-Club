import Link from 'next/link';
import { logout } from '@/app/actions/auth';
import { createGroup, joinCode } from '@/app/actions/groups';
import { SingleFieldForm } from '@/components/FormCard';
import { AppBar } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { SectionCard } from '@/components/sport/SectionCard';
import { groupInitials } from '@/lib/design';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function Home() {
  const user = await requireUser();
  const sb = await createServerSupabase();
  const { data } = await sb
    .from('group_members')
    .select('role, groups(id, name, location)')
    .eq('user_id', user.id)
    .order('joined_at');
  const groups = ((data ?? []) as unknown as { role: string; groups: { id: string; name: string; location: string | null } | null }[])
    .map((g) => g.groups)
    .filter((g): g is { id: string; name: string; location: string | null } => !!g);

  return (
    <>
      <AppBar
        title="Billiard-Tracker"
        subtitle={`Angemeldet als ${user.displayName}`}
        initials="BT"
        right={
          <form action={logout}>
            <button className="rounded-lg px-2 py-1.5 text-xs font-bold text-bar-muted hover:bg-white/10 hover:text-bar-fg">Abmelden</button>
          </form>
        }
      />
      <div className="space-y-3 p-4">
        <SectionCard title="Meine Gruppen" flush>
          {groups.length === 0 ? (
            <EmptyState title="Noch keine Gruppe" text="Leg unten eine Gruppe an oder gib einen Einladungscode ein." />
          ) : (
            <ul>
              {groups.map((g) => (
                <li key={g.id} className="border-t border-line first:border-t-0">
                  <Link href={`/g/${g.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <span className="font-cond grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-accent text-lg font-extrabold tracking-wide text-white">
                      {groupInitials(g.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-cond block truncate text-xl leading-tight font-extrabold uppercase">{g.name}</span>
                      {g.location && <span className="block truncate text-xs text-muted">{g.location}</span>}
                    </span>
                    <span className="text-muted">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Code eingeben">
          <p className="mb-3 text-sm text-muted">Sitzungscode (6 Zeichen) oder Gruppen-Einladung (8 Zeichen).</p>
          <SingleFieldForm action={joinCode} name="code" placeholder="z. B. K7P2QX" button="Los" maxLength={8} uppercase />
        </SectionCard>

        <SectionCard title="Neue Gruppe">
          <SingleFieldForm action={createGroup} name="name" placeholder="Name, z. B. Kaarster Billiard Club" button="Anlegen" maxLength={60} />
        </SectionCard>
      </div>
    </>
  );
}
