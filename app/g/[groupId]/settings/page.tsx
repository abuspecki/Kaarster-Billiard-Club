import { notFound } from 'next/navigation';
import { regenerateInvite, removeMember, renameGroup, updateGroupLocation } from '@/app/actions/groups';
import { ActionButton } from '@/components/ActionButton';
import { SingleFieldForm } from '@/components/FormCard';
import { AppBar } from '@/components/sport/AppBar';
import { PlayerBadge } from '@/components/sport/PlayerBadge';
import { SectionCard } from '@/components/sport/SectionCard';
import { loadGroup } from '@/lib/data';
import { groupInitials } from '@/lib/design';
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
    <>
      <AppBar title="Einstellungen" subtitle={group.name} initials={groupInitials(group.name)} back={{ href: `/g/${groupId}`, label: group.name }} />
      <div className="space-y-3 p-4">
        <SectionCard title="Gruppenname">
          <SingleFieldForm action={renameGroup.bind(null, groupId)} name="name" placeholder="Name" button="Speichern" defaultValue={group.name} maxLength={60} />
        </SectionCard>

        <SectionCard title="Ort">
          <p className="mb-3 text-sm text-muted">Steht unter dem Gruppennamen, z. B. „Spielhalle Kaarst“. Leer lassen zum Entfernen.</p>
          <SingleFieldForm
            action={updateGroupLocation.bind(null, groupId)}
            name="location"
            placeholder="z. B. Spielhalle Kaarst"
            button="Speichern"
            defaultValue={group.location ?? ''}
            maxLength={60}
            optional
          />
        </SectionCard>

        <SectionCard title="Einladungscode">
          <p className="mb-3 text-sm text-muted">
            Aktuell <span className="font-mono font-bold tracking-widest text-fg">{group.invite_code}</span>. Ein neuer Code macht alte Einladungslinks
            ungültig.
          </p>
          <ActionButton action={regenerateInvite.bind(null, groupId)} variant="secondary" confirmText="Alte Einladungslinks werden ungültig. Fortfahren?">
            Neuen Code erzeugen
          </ActionButton>
        </SectionCard>

        <SectionCard title={`Mitglieder (${members.length})`} flush>
          <ul>
            {members.map((m) => {
              const name = m.profiles?.display_name ?? '?';
              return (
                <li key={m.user_id} className="flex items-center gap-3 border-t border-line px-4 py-3 first:border-t-0">
                  <PlayerBadge player={`u:${m.user_id}`} name={name} />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {name}
                    {m.role === 'admin' && (
                      <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-muted uppercase">Admin</span>
                    )}
                  </span>
                  {m.user_id !== user.id && (
                    <ActionButton
                      action={removeMember.bind(null, groupId, m.user_id)}
                      variant="danger"
                      className="px-3 py-1.5 text-sm"
                      confirmText={`${name} aus der Gruppe entfernen?`}
                    >
                      Entfernen
                    </ActionButton>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}
