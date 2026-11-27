import type { Pairing } from '@/components/sport/NowPlaying';
import { bracketFormat, type BracketMatch } from './bracket';
import type { PlayerKey } from './types';

export function roundName(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  return fromEnd === 0 ? 'Finale' : fromEnd === 1 ? 'Halbfinale' : fromEnd === 2 ? 'Viertelfinale' : `Runde ${round}`;
}

export function matchLabel(m: BracketMatch, bracket: BracketMatch[]): string {
  if (bracketFormat(bracket) === 'single') return roundName(m.round, Math.max(...bracket.map((x) => x.round)));
  if (m.section === 'F') return 'Finale';
  return `${m.section === 'L' ? 'Verliererrunde' : 'Gewinnerrunde'} ${m.round}`;
}

export interface TournamentPlayer {
  id: string;
  name: string;
  userId: string | null;
}

const keyOf = (p: TournamentPlayer): PlayerKey => (p.userId ? `u:${p.userId}` : `g:${p.id}`);

export function teamName(teams: string[][], i: number, players: TournamentPlayer[]): string {
  return (teams[i] ?? []).map((id) => players.find((p) => p.id === id)?.name ?? '?').join(' + ');
}

export function pairing(m: BracketMatch | null, bracket: BracketMatch[], teams: string[][], players: TournamentPlayer[]): Pairing | null {
  if (!m || m.teamA === null || m.teamB === null) return null;
  const solo = (i: number) => (teams[i]?.length === 1 ? players.find((p) => p.id === teams[i][0]) : undefined);
  const a = solo(m.teamA);
  const b = solo(m.teamB);
  return {
    a: teamName(teams, m.teamA, players),
    b: teamName(teams, m.teamB, players),
    aKey: a ? keyOf(a) : undefined,
    bKey: b ? keyOf(b) : undefined,
    label: matchLabel(m, bracket),
  };
}
