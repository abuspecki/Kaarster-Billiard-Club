import { notFound } from 'next/navigation';
import { SessionLive } from '@/components/SessionLive';
import { loadSessionView } from '@/lib/session-data';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function SessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  let view = await loadSessionView(sb, sessionId, user.id);
  if (!view) notFound();
  if (view.status === 'active' && view.me.isMember) {
    const { data: ended } = await sb.rpc('end_stale_sessions', { p_group_id: view.groupId });
    if (ended) view = (await loadSessionView(sb, sessionId, user.id))!;
  }
  const canEnd = view.createdBy === user.id || view.me.isAdmin;
  return <SessionLive view={view} canEnd={canEnd} />;
}
