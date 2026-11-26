import { joinCode } from '@/app/actions/groups';
import { SingleFieldForm } from '@/components/FormCard';
import { Card } from '@/components/ui';
import { requireUser } from '@/lib/supabase/server';

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const { code } = await params;
  const isSession = code.length === 6;
  return (
    <Card className="mt-6">
      <h1 className="mb-2 text-xl font-bold">{isSession ? 'Sitzung beitreten' : 'Gruppe beitreten'}</h1>
      <p className="mb-4 text-stone-600">Du wurdest eingeladen. Code prüfen und beitreten:</p>
      <SingleFieldForm action={joinCode} name="code" placeholder="Code" button="Beitreten" defaultValue={code.toUpperCase()} maxLength={8} uppercase />
    </Card>
  );
}
