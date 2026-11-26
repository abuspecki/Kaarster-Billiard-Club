'use server';

import { revalidatePath } from 'next/cache';
import { BracketError, champion, generateBracket, setWinner, type BracketMatch } from '@/lib/bracket';
import { createServerSupabase } from '@/lib/supabase/server';
import type { ActionResult } from './session';

export async function createTournament(sessionId: string, teamSize: number, teams: string[][]): Promise<ActionResult> {
  if (teams.length < 2 || teams.some((t) => t.length === 0)) return { error: 'Mindestens 2 Teams mit Spielern nötig.' };
  const sb = await createServerSupabase();
  const { error } = await sb.rpc('create_tournament', {
    p_session_id: sessionId,
    p_team_size: teamSize,
    p_teams: teams,
    p_bracket: generateBracket(teams.length),
  });
  if (error) return { error: error.message };
  revalidatePath(`/s/${sessionId}/tournament`);
  return {};
}

export async function setTournamentWinner(
  sessionId: string,
  tournamentId: string,
  expectedVersion: number,
  bracketMatchId: string,
  team: number,
): Promise<ActionResult> {
  const sb = await createServerSupabase();
  const { data: t } = await sb.from('tournaments').select('bracket, version').eq('id', tournamentId).maybeSingle();
  if (!t) return { error: 'Turnier nicht gefunden' };
  if (t.version !== expectedVersion) {
    revalidatePath(`/s/${sessionId}/tournament`);
    return { error: 'Stand hat sich geändert – bitte noch einmal prüfen.' };
  }
  let next: BracketMatch[];
  try {
    next = setWinner(t.bracket as BracketMatch[], bracketMatchId, team);
  } catch (e) {
    if (e instanceof BracketError) return { error: e.message };
    throw e;
  }
  const { error } = await sb.rpc('record_tournament_result', {
    p_tournament_id: tournamentId,
    p_expected_version: expectedVersion,
    p_bracket: next,
    p_bracket_match_id: bracketMatchId,
    p_finished: champion(next) !== null,
  });
  revalidatePath(`/s/${sessionId}/tournament`);
  if (error) return { error: error.message.includes('Stand hat sich') ? 'Stand hat sich geändert – bitte noch einmal prüfen.' : error.message };
  return {};
}
