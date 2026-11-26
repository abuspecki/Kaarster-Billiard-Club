export interface BracketMatch {
  id: string; // `r${round}-s${slot}`
  round: number; // ab 1
  slot: number; // ab 0
  teamA: number | null; // Team-Index (0 = bestgesetzt)
  teamB: number | null;
  winner: number | null;
  isBye: boolean;
  matchId: string | null; // verknüpfte Zeile in `matches`
}

export class BracketError extends Error {}

const matchId = (round: number, slot: number) => `r${round}-s${slot}`;

function seedOrder(size: number): number[] {
  let cur = [1];
  while (cur.length < size) {
    const len = cur.length;
    cur = cur.flatMap((s) => [s, 2 * len + 1 - s]);
  }
  return cur;
}

function nextOf(m: BracketMatch): { id: string; field: 'teamA' | 'teamB' } {
  return { id: matchId(m.round + 1, Math.floor(m.slot / 2)), field: m.slot % 2 === 0 ? 'teamA' : 'teamB' };
}

export function generateBracket(teamCount: number): BracketMatch[] {
  if (!Number.isInteger(teamCount) || teamCount < 2) throw new BracketError('Mindestens 2 Teams nötig');
  let size = 1;
  while (size < teamCount) size *= 2;
  const rounds = Math.log2(size);
  const order = seedOrder(size);

  const bracket: BracketMatch[] = [];
  for (let round = 1; round <= rounds; round++) {
    const slots = size / 2 ** round;
    for (let slot = 0; slot < slots; slot++) {
      bracket.push({ id: matchId(round, slot), round, slot, teamA: null, teamB: null, winner: null, isBye: false, matchId: null });
    }
  }
  const byId = new Map(bracket.map((m) => [m.id, m]));

  for (let slot = 0; slot < size / 2; slot++) {
    const m = byId.get(matchId(1, slot))!;
    const seedA = order[2 * slot];
    const seedB = order[2 * slot + 1];
    m.teamA = seedA <= teamCount ? seedA - 1 : null;
    m.teamB = seedB <= teamCount ? seedB - 1 : null;
    if (m.teamA === null || m.teamB === null) {
      m.isBye = true;
      m.winner = m.teamA ?? m.teamB;
      const next = byId.get(nextOf(m).id);
      if (next) next[nextOf(m).field] = m.winner;
    }
  }
  return bracket;
}

export function canChangeResult(bracket: BracketMatch[], id: string): boolean {
  const m = bracket.find((x) => x.id === id);
  if (!m || m.isBye || m.teamA === null || m.teamB === null) return false;
  const next = bracket.find((x) => x.id === nextOf(m).id);
  return !next || next.winner === null;
}

export function setWinner(bracket: BracketMatch[], id: string, team: number): BracketMatch[] {
  const copy = bracket.map((m) => ({ ...m }));
  const m = copy.find((x) => x.id === id);
  if (!m) throw new BracketError('Partie nicht gefunden');
  if (m.isBye) throw new BracketError('Freilos kann nicht gewertet werden');
  if (m.teamA === null || m.teamB === null) throw new BracketError('Partie hat noch nicht beide Teams');
  if (team !== m.teamA && team !== m.teamB) throw new BracketError('Team spielt nicht in dieser Partie');
  if (!canChangeResult(copy, id)) throw new BracketError('Folgepartie ist bereits entschieden');

  m.winner = team;
  const { id: nextId, field } = nextOf(m);
  const next = copy.find((x) => x.id === nextId);
  if (next) next[field] = team;
  return copy;
}

export function champion(bracket: BracketMatch[]): number | null {
  const maxRound = Math.max(...bracket.map((m) => m.round));
  return bracket.find((m) => m.round === maxRound)?.winner ?? null;
}
