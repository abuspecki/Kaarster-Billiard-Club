import Link from 'next/link';
import { createGroup, joinCode } from '@/app/actions/groups';
import { SingleFieldForm } from '@/components/FormCard';
import { Card } from '@/components/ui';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function Home() {
  const user = await requireUser();
  const sb = await createServerSupabase();
  const { data } = await sb
    .from('group_members')
    .select('role, groups(id, name)')
    .eq('user_id', user.id)
    .order('joined_at');
  const groups = ((data ?? []) as unknown as { role: string; groups: { id: string; name: string } | null }[]).filter((g) => g.groups);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-2 font-semibold">Code eingeben</h2>
        <p className="mb-3 text-sm text-stone-600">Sitzungscode (6 Zeichen) oder Gruppen-Einladung (8 Zeichen).</p>
        <SingleFieldForm action={joinCode} name="code" placeholder="z. B. K7P2QX" button="Los" maxLength={8} uppercase />
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Meine Gruppen</h2>
        {groups.length === 0 ? (
          <p className="text-sm text-stone-600">Du bist noch in keiner Gruppe. Leg eine an oder gib oben einen Code ein.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {groups.map((g) => (
              <li key={g.groups!.id}>
                <Link href={`/g/${g.groups!.id}`} className="flex items-center justify-between py-3 text-lg font-medium">
                  {g.groups!.name}
                  <span className="text-stone-400">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Neue Gruppe</h2>
        <SingleFieldForm action={createGroup} name="name" placeholder="Name, z. B. Kaarster Billiard Club" button="Anlegen" maxLength={60} />
      </Card>
    </div>
  );
}
