import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FORMER_MEMBER } from './data';
import type { Side } from './types';

export interface SessionPlayer {
  id: string; // session_player id
  userId: string | null;
  name: string;
  isGuest: boolean;
}

export interface SessionMatch {
  id: string;
  createdAt: string;
  sideA: string[]; // session_player ids
  sideB: string[];
  winner: Side;
  createdByName: string | null;
  isTournament: boolean;
}

export interface SessionView {
  id: string;
  code: string;
  status: 'active' | 'ended';
  groupId: string;
  groupName: string;
  createdBy: string | null;
  createdAt: string;
  players: SessionPlayer[];
  matches: SessionMatch[];
  me: { playerId: string | null; isMember: boolean; isAdmin: boolean };
}

export async function loadSessionView(sb: SupabaseClient, sessionId: string, userId: string): Promise<SessionView | null> {
  const { data: s } = await sb
    .from('sessions')
    .select('id, code, status, group_id, created_by, created_at, groups(name)')
    .eq('id', sessionId)
    .maybeSingle();
  if (!s) return null;
  const session = s as unknown as {
    id: string; code: string; status: 'active' | 'ended'; group_id: string; created_by: string | null; created_at: string;
    groups: { name: string } | null;
  };

  const [{ data: playerRows }, { data: matchRows }, { data: me }] = await Promise.all([
    sb.from('session_players').select('id, user_id, guest_name, created_at, profiles(display_name)').eq('session_id', sessionId).order('created_at'),
    sb
      .from('matches')
      .select('id, created_at, winner_side, tournament_id, profiles(display_name), match_players(side, session_player_id)')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }),
    sb.from('group_members').select('role').eq('group_id', session.group_id).eq('user_id', userId).maybeSingle(),
  ]);

  const players: SessionPlayer[] = ((playerRows ?? []) as unknown as {
    id: string; user_id: string | null; guest_name: string | null; profiles: { display_name: string } | null;
  }[]).map((p) => ({
    id: p.id,
    userId: p.user_id,
    name: p.user_id ? (p.profiles?.display_name ?? FORMER_MEMBER) : (p.guest_name ?? 'Gast'),
    isGuest: !p.user_id,
  }));

  const matches: SessionMatch[] = ((matchRows ?? []) as unknown as {
    id: string; created_at: string; winner_side: Side; tournament_id: string | null;
    profiles: { display_name: string } | null; match_players: { side: Side; session_player_id: string }[];
  }[]).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    sideA: m.match_players.filter((p) => p.side === 'A').map((p) => p.session_player_id),
    sideB: m.match_players.filter((p) => p.side === 'B').map((p) => p.session_player_id),
    winner: m.winner_side,
    createdByName: m.profiles?.display_name ?? null,
    isTournament: m.tournament_id !== null,
  }));

  return {
    id: session.id,
    code: session.code,
    status: session.status,
    groupId: session.group_id,
    groupName: session.groups?.name ?? '',
    createdBy: session.created_by,
    createdAt: session.created_at,
    players,
    matches,
    me: {
      playerId: players.find((p) => p.userId === userId)?.id ?? null,
      isMember: !!me,
      isAdmin: me?.role === 'admin',
    },
  };
}
