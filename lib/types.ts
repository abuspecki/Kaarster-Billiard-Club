export type Side = 'A' | 'B';
/** "u:<user uuid>" für Konten, "g:<session_player uuid>" für Gäste */
export type PlayerKey = string;

export interface MatchRecord {
  id: string;
  playedAt: string; // ISO
  sideA: PlayerKey[];
  sideB: PlayerKey[];
  winner: Side;
  sessionId?: string;
}

export interface Standing {
  player: PlayerKey;
  wins: number;
  losses: number;
  played: number;
  winRate: number; // 0..1, 0 bei 0 Partien
  singlesWins: number;
  singlesLosses: number;
  teamWins: number;
  teamLosses: number;
}
