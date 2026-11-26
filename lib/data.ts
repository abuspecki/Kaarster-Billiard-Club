import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { toMatchRecords, type MatchRow } from './mapping';
import { FORMER_MEMBER } from './names';
import type { MatchRecord, PlayerKey } from './types';

export { toMatchRecords } from './mapping';

const MATCH_SELECT = 'id, created_at, session_id, winner_side, match_players(side, user_id, session_player_id)';
const PAGE = 1000;

async function loadMatches(sb: SupabaseClient, column: 'group_id' | 'session_id', value: string): Promise<MatchRecord[]> {
  const rows: MatchRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('matches')
      .select(MATCH_SELECT)
      .eq(column, value)
      .order('created_at')
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as MatchRow[]));
    if (!data || data.length < PAGE) break;
  }
  return toMatchRecords(rows);
}

export const loadGroupMatches = (sb: SupabaseClient, groupId: string) => loadMatches(sb, 'group_id', groupId);
export const loadSessionMatches = (sb: SupabaseClient, sessionId: string) => loadMatches(sb, 'session_id', sessionId);

export { FORMER_MEMBER, displayName as nameOf } from './names';

/** Namen aller Gruppenmitglieder und (optional) aller Teilnehmer einer Sitzung, inkl. Gäste. */
export async function loadNames(sb: SupabaseClient, groupId: string, sessionId?: string): Promise<Record<PlayerKey, string>> {
  const names: Record<PlayerKey, string> = {};
  const [{ data: members }, sessionPlayers] = await Promise.all([
    sb.from('group_members').select('user_id, profiles(display_name)').eq('group_id', groupId),
    sessionId
      ? sb.from('session_players').select('id, user_id, guest_name, profiles(display_name)').eq('session_id', sessionId)
      : Promise.resolve({ data: null }),
  ]);
  for (const m of (members ?? []) as unknown as { user_id: string; profiles: { display_name: string } | null }[]) {
    names[`u:${m.user_id}`] = m.profiles?.display_name ?? FORMER_MEMBER;
  }
  if (sessionId) {
    const players = sessionPlayers.data;
    for (const p of (players ?? []) as unknown as SessionPlayerRow[]) {
      if (p.user_id) names[`u:${p.user_id}`] = p.profiles?.display_name ?? names[`u:${p.user_id}`] ?? FORMER_MEMBER;
      else names[`g:${p.id}`] = p.guest_name ?? 'Gast';
    }
  }
  return names;
}

export interface SessionPlayerRow {
  id: string;
  user_id: string | null;
  guest_name: string | null;
  profiles: { display_name: string } | null;
}

export async function loadGroup(sb: SupabaseClient, groupId: string, userId: string) {
  const [{ data: group }, { data: me }] = await Promise.all([
    sb.from('groups').select('id, name, invite_code, location').eq('id', groupId).maybeSingle(),
    sb.from('group_members').select('role').eq('group_id', groupId).eq('user_id', userId).maybeSingle(),
  ]);
  if (!group) return null;
  return { ...(group as { id: string; name: string; invite_code: string; location: string | null }), isAdmin: me?.role === 'admin' };
}

