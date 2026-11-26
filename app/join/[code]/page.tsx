import { joinCode } from '@/app/actions/groups';
import { SingleFieldForm } from '@/components/FormCard';
import { AppBar } from '@/components/sport/AppBar';
import { SectionCard } from '@/components/sport/SectionCard';
import { requireUser } from '@/lib/supabase/server';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const { code } = await params;
  const isSession = code.length === 6;
  return (
    <>
      <AppBar title={isSession ? 'Sitzung beitreten' : 'Gruppe beitreten'} initials="BT" back={{ href: '/', label: 'Startseite' }} />
      <div className="p-4">
        <SectionCard title="Du wurdest eingeladen">
          <p className="mb-4 text-sm text-muted">Code prüfen und beitreten:</p>
          <SingleFieldForm action={joinCode} name="code" placeholder="Code" button="Beitreten" defaultValue={code.toUpperCase()} maxLength={8} uppercase />
        </SectionCard>
      </div>
    </>
  );
}
