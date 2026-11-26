import Link from 'next/link';
import { notFound } from 'next/navigation';
import { regenerateInvite, removeMember, renameGroup, updateGroupLocation } from '@/app/actions/groups';
import { SingleFieldForm } from '@/components/FormCard';
import { ActionButton } from '@/components/ActionButton';
import { Card } from '@/components/ui';
import { loadGroup } from '@/lib/data';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function SettingsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const group = await loadGroup(sb, groupId, user.id);
  if (!group || !group.isAdmin) notFound();
  const { data } = await sb.from('group_members').select('user_id, role, profiles(display_name)').eq('group_id', groupId);
  const members = ((data ?? []) as unknown as { user_id: string; role: string; profiles: { display_name: string } | null }[]).sort((a, b) =>
    (a.profiles?.display_name ?? '').localeCompare(b.profiles?.display_name ?? '', 'de'),
  );

  return (
    <div className="space-y-4">
      <Link href={`/g/${groupId}`} className="text-sm font-semibold text-emerald-700">
        ‹ Zurück zur Gruppe
      </Link>
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      <Card>
        <h2 className="mb-2 font-semibold">Gruppenname</h2>
        <SingleFieldForm action={renameGroup.bind(null, groupId)} name="name" placeholder="Name" button="Speichern" defaultValue={group.name} maxLength={60} />
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Ort</h2>
        <SingleFieldForm
          action={updateGroupLocation.bind(null, groupId)}
          name="location"
          placeholder="z. B. Spielhalle Kaarst"
          button="Speichern"
          defaultValue={group.location ?? ''}
          maxLength={60}
          optional
        />
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold">Einladungscode</h2>
        <p className="mb-3 text-sm text-stone-600">
          Aktuell: <span className="font-mono font-bold tracking-widest">{group.invite_code}</span>. Ein neuer Code macht alte
          Einladungslinks ungültig.
        </p>
        <ActionButton action={regenerateInvite.bind(null, groupId)} variant="secondary" confirmText="Alte Einladungslinks werden ungültig. Fortfahren?">
          Neuen Code erzeugen
        </ActionButton>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold">Mitglieder</h2>
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between py-2">
              <span>
                {m.profiles?.display_name ?? '?'}
                {m.role === 'admin' && <span className="ml-2 rounded bg-stone-100 px-2 py-0.5 text-xs">Admin</span>}
              </span>
              {m.user_id !== user.id && (
                <ActionButton
                  action={removeMember.bind(null, groupId, m.user_id)}
                  variant="danger"
                  className="px-3 py-1.5 text-sm"
                  confirmText={`${m.profiles?.display_name ?? 'Mitglied'} aus der Gruppe entfernen?`}
                >
                  Entfernen
                </ActionButton>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
