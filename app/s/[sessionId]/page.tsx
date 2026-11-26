import { notFound } from 'next/navigation';
import { SessionLive } from '@/components/SessionLive';
import { loadSessionView } from '@/lib/session-data';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const view = await loadSessionView(sb, sessionId, user.id);
  if (!view) notFound();
  const canEnd = view.createdBy === user.id || view.me.isAdmin;
  return <SessionLive view={view} canEnd={canEnd} />;
}
