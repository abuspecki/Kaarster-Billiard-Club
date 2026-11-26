import { notFound } from 'next/navigation';
import { TournamentLive, type TournamentData } from '@/components/TournamentLive';
import { loadSessionView } from '@/lib/session-data';
import { createServerSupabase, requireUser } from '@/lib/supabase/server';

export default async function TournamentPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireUser();
  const sb = await createServerSupabase();
  const view = await loadSessionView(sb, sessionId, user.id);
  if (!view) notFound();
  const { data } = await sb
    .from('tournaments')
    .select('id, version, status, teams, bracket')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return <TournamentLive key={(data as TournamentData | null)?.id ?? 'none'} view={view} tournament={(data as TournamentData | null) ?? null} />;
}
