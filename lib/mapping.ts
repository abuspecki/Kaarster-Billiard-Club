import type { MatchRecord, Side } from './types';

export interface MatchRow {
  id: string;
  created_at: string;
  winner_side: Side;
  match_players: { side: Side; user_id: string | null; session_player_id: string }[];
}

export const playerKeyOf = (p: { user_id: string | null; session_player_id: string }) =>
  p.user_id ? `u:${p.user_id}` : `g:${p.session_player_id}`;

export function toMatchRecords(rows: MatchRow[]): MatchRecord[] {
  return rows.map((r) => ({
    id: r.id,
    playedAt: r.created_at,
    sideA: r.match_players.filter((p) => p.side === 'A').map(playerKeyOf),
    sideB: r.match_players.filter((p) => p.side === 'B').map(playerKeyOf),
    winner: r.winner_side,
  }));
}
