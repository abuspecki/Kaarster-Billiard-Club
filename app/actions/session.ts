'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import type { Side } from '@/lib/types';

export type ActionResult = { error?: string };

async function run(sessionId: string, fn: string, args: Record<string, unknown>): Promise<ActionResult> {
  const sb = await createServerSupabase();
  const { error } = await sb.rpc(fn, args);
  if (error) return { error: error.message };
  revalidatePath(`/s/${sessionId}`);
  return {};
}

export async function recordMatch(
  sessionId: string,
  sideA: string[],
  sideB: string[],
  winner: Side,
): Promise<ActionResult & { id?: string }> {
  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc('record_match', { p_session_id: sessionId, p_side_a: sideA, p_side_b: sideB, p_winner: winner });
  if (error) return { error: error.message };
  revalidatePath(`/s/${sessionId}`);
  return { id: data as string };
}

export async function updateMatch(sessionId: string, matchId: string, sideA: string[], sideB: string[], winner: Side) {
  return run(sessionId, 'update_match', { p_match_id: matchId, p_side_a: sideA, p_side_b: sideB, p_winner: winner });
}

export async function deleteMatch(sessionId: string, matchId: string) {
  return run(sessionId, 'delete_match', { p_match_id: matchId });
}

export async function addGuest(sessionId: string, name: string) {
  return run(sessionId, 'add_guest', { p_session_id: sessionId, p_name: name });
}

export async function setPlayerPaused(sessionId: string, playerId: string, paused: boolean) {
  return run(sessionId, 'set_player_paused', { p_session_player_id: playerId, p_paused: paused });
}

export async function joinSession(sessionId: string, code: string) {
  return run(sessionId, 'join_by_code', { p_code: code });
}

export async function endSession(sessionId: string): Promise<ActionResult> {
  const result = await run(sessionId, 'end_session', { p_session_id: sessionId });
  if (result.error) return result;
  redirect(`/s/${sessionId}/summary`);
}
