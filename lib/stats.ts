import type { MatchRecord, PlayerKey, Standing } from './types';

export const isGuest = (p: PlayerKey) => p.startsWith('g:');

function byTime(matches: MatchRecord[]): MatchRecord[] {
  return [...matches].sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id));
}

function emptyStanding(player: PlayerKey): Standing {
  return { player, wins: 0, losses: 0, played: 0, winRate: 0, singlesWins: 0, singlesLosses: 0, teamWins: 0, teamLosses: 0 };
}

export function computeStandings(matches: MatchRecord[], opts: { includeGuests?: boolean } = {}): Standing[] {
  const table = new Map<PlayerKey, Standing>();
  const get = (p: PlayerKey) => {
    let s = table.get(p);
    if (!s) table.set(p, (s = emptyStanding(p)));
    return s;
  };

  for (const match of matches) {
    const singles = match.sideA.length === 1 && match.sideB.length === 1;
    const winners = match.winner === 'A' ? match.sideA : match.sideB;
    const losers = match.winner === 'A' ? match.sideB : match.sideA;
    for (const p of winners) {
      const s = get(p);
      s.wins++;
      if (singles) s.singlesWins++;
      else s.teamWins++;
    }
    for (const p of losers) {
      const s = get(p);
      s.losses++;
      if (singles) s.singlesLosses++;
      else s.teamLosses++;
    }
  }

  const result = [...table.values()].filter((s) => opts.includeGuests || !isGuest(s.player));
  for (const s of result) {
    s.played = s.wins + s.losses;
    s.winRate = s.played === 0 ? 0 : s.wins / s.played;
  }
  return result.sort(
    (a, b) => b.wins - a.wins || b.winRate - a.winRate || a.played - b.played || a.player.localeCompare(b.player),
  );
}

export function headToHead(matches: MatchRecord[], a: PlayerKey, b: PlayerKey): { aWins: number; bWins: number } {
  let aWins = 0;
  let bWins = 0;
  for (const match of matches) {
    const aSide = match.sideA.includes(a) ? 'A' : match.sideB.includes(a) ? 'B' : null;
    const bSide = match.sideA.includes(b) ? 'A' : match.sideB.includes(b) ? 'B' : null;
    if (!aSide || !bSide || aSide === bSide) continue;
    if (match.winner === aSide) aWins++;
    else bWins++;
  }
  return { aWins, bWins };
}

export function longestStreak(
  matches: MatchRecord[],
  opts: { includeGuests?: boolean } = {},
): { player: PlayerKey; length: number } | null {
  const current = new Map<PlayerKey, number>();
  let best: { player: PlayerKey; length: number } | null = null;
  for (const match of byTime(matches)) {
    const winners = match.winner === 'A' ? match.sideA : match.sideB;
    const losers = match.winner === 'A' ? match.sideB : match.sideA;
    for (const p of losers) current.set(p, 0);
    for (const p of winners) {
      const len = (current.get(p) ?? 0) + 1;
      current.set(p, len);
      if ((opts.includeGuests || !isGuest(p)) && (!best || len > best.length)) best = { player: p, length: len };
    }
  }
  return best;
}
