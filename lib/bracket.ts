/**
 * Turnierbaum als Graph: Jede Partie kennt ihre Quellen (festes Team, Sieger oder Verlierer
 * einer anderen Partie). Damit funktionieren einfaches und doppeltes K.o. mit derselben Logik.
 */

export type Source = { type: 'team'; team: number | null } | { type: 'winner' | 'loser'; match: string };
export type Section = 'W' | 'L' | 'F';
export type BracketFormat = 'single' | 'double';

export interface BracketMatch {
  id: string;
  round: number; // ab 1, je Abschnitt
  slot: number; // ab 0
  section?: Section; // fehlt bei alten Bäumen = 'W'
  teamA: number | null; // Team-Index (0 = bestgesetzt)
  teamB: number | null;
  winner: number | null;
  isBye: boolean; // Freilos oder leere Partie – wird nicht gespielt
  matchId: string | null; // verknüpfte Zeile in `matches`
  srcA?: Source; // fehlt bei alten Bäumen → normalize()
  srcB?: Source;
}

export class BracketError extends Error {}

const ABSENT = 'absent' as const;
const PENDING = 'pending' as const;
type Slot = number | typeof ABSENT | typeof PENDING;

function seedOrder(size: number): number[] {
  let cur = [1];
  while (cur.length < size) {
    const len = cur.length;
    cur = cur.flatMap((s) => [s, 2 * len + 1 - s]);
  }
  return cur;
}

const sectionOf = (m: BracketMatch): Section => m.section ?? 'W';

function blank(id: string, round: number, slot: number, section: Section, srcA: Source, srcB: Source): BracketMatch {
  return { id, round, slot, section, teamA: null, teamB: null, winner: null, isBye: false, matchId: null, srcA, srcB };
}

/** Partien so sortieren, dass Quellen immer vor ihren Abhängigen kommen. */
function topo(bracket: BracketMatch[]): BracketMatch[] {
  const byId = new Map(bracket.map((m) => [m.id, m]));
  const done = new Set<string>();
  const out: BracketMatch[] = [];
  const visit = (m: BracketMatch) => {
    if (done.has(m.id)) return;
    done.add(m.id);
    for (const s of [m.srcA, m.srcB]) if (s && s.type !== 'team') visit(byId.get(s.match)!);
    out.push(m);
  };
  bracket.forEach(visit);
  return out;
}

/** Teams, Freilose und Sieger aus den Quellen neu berechnen. Manuelle Sieger bleiben, wenn sie noch passen. */
export function resolve(bracket: BracketMatch[]): BracketMatch[] {
  const copy = bracket.map((m) => ({ ...m }));
  const winnerOf = new Map<string, Slot>();
  const loserOf = new Map<string, Slot>();
  const read = (s: Source): Slot => {
    if (s.type === 'team') return s.team === null ? ABSENT : s.team;
    return (s.type === 'winner' ? winnerOf : loserOf).get(s.match) ?? PENDING;
  };

  for (const m of topo(copy)) {
    const a = read(m.srcA!);
    const b = read(m.srcB!);
    m.teamA = typeof a === 'number' ? a : null;
    m.teamB = typeof b === 'number' ? b : null;

    if (a === ABSENT || b === ABSENT) {
      m.isBye = true;
      const other = a === ABSENT ? b : a;
      m.winner = typeof other === 'number' ? other : null;
      winnerOf.set(m.id, other); // Team, ausstehend oder (beide abwesend) abwesend
      loserOf.set(m.id, other === PENDING ? PENDING : ABSENT);
      continue;
    }

    m.isBye = false;
    if (m.winner !== null && m.winner !== m.teamA && m.winner !== m.teamB) m.winner = null;
    if (m.teamA === null || m.teamB === null) m.winner = null;
    if (m.winner !== null) {
      winnerOf.set(m.id, m.winner);
      loserOf.set(m.id, m.winner === m.teamA ? m.teamB! : m.teamA!);
    } else {
      winnerOf.set(m.id, PENDING);
      loserOf.set(m.id, PENDING);
    }
  }
  return copy;
}

/** Ergänzt fehlende Quellen alter (einfacher K.o.-)Bäume und löst neu auf. */
export function normalize(bracket: BracketMatch[]): BracketMatch[] {
  if (bracket.every((m) => m.srcA && m.srcB)) return resolve(bracket);
  const withSources = bracket.map((m) => {
    if (m.srcA && m.srcB) return m;
    if (m.round === 1) {
      return { ...m, section: 'W' as Section, srcA: { type: 'team', team: m.teamA } as Source, srcB: { type: 'team', team: m.teamB } as Source };
    }
    const prev = (slot: number) => ({ type: 'winner', match: `r${m.round - 1}-s${slot}` }) as Source;
    return { ...m, section: 'W' as Section, srcA: prev(2 * m.slot), srcB: prev(2 * m.slot + 1) };
  });
  return resolve(withSources);
}

function singleBracket(teamCount: number, prefix: (r: number, s: number) => string, section: Section): BracketMatch[] {
  let size = 1;
  while (size < teamCount) size *= 2;
  const rounds = Math.log2(size);
  const order = seedOrder(size);
  const out: BracketMatch[] = [];
  for (let slot = 0; slot < size / 2; slot++) {
    const team = (seed: number): Source => ({ type: 'team', team: seed <= teamCount ? seed - 1 : null });
    out.push(blank(prefix(1, slot), 1, slot, section, team(order[2 * slot]), team(order[2 * slot + 1])));
  }
  for (let r = 2; r <= rounds; r++) {
    for (let slot = 0; slot < size / 2 ** r; slot++) {
      out.push(
        blank(prefix(r, slot), r, slot, section, { type: 'winner', match: prefix(r - 1, 2 * slot) }, { type: 'winner', match: prefix(r - 1, 2 * slot + 1) }),
      );
    }
  }
  return out;
}

function doubleBracket(teamCount: number): BracketMatch[] {
  const w = (r: number, s: number) => `W${r}-${s}`;
  const l = (r: number, s: number) => `L${r}-${s}`;
  const out = singleBracket(teamCount, w, 'W');
  let size = 1;
  while (size < teamCount) size *= 2;
  const k = Math.log2(size);

  if (k === 1) {
    out.push(blank('F', 1, 0, 'F', { type: 'winner', match: w(1, 0) }, { type: 'loser', match: w(1, 0) }));
    return out;
  }

  for (let s = 0; s < size / 4; s++) {
    out.push(blank(l(1, s), 1, s, 'L', { type: 'loser', match: w(1, 2 * s) }, { type: 'loser', match: w(1, 2 * s + 1) }));
  }
  for (let j = 1; j <= k - 1; j++) {
    const n = size / 2 ** (j + 1);
    for (let s = 0; s < n; s++) {
      out.push(blank(l(2 * j, s), 2 * j, s, 'L', { type: 'winner', match: l(2 * j - 1, s) }, { type: 'loser', match: w(j + 1, n - 1 - s) }));
    }
    if (j < k - 1) {
      for (let s = 0; s < n / 2; s++) {
        out.push(
          blank(l(2 * j + 1, s), 2 * j + 1, s, 'L', { type: 'winner', match: l(2 * j, 2 * s) }, { type: 'winner', match: l(2 * j, 2 * s + 1) }),
        );
      }
    }
  }
  out.push(blank('F', 1, 0, 'F', { type: 'winner', match: w(k, 0) }, { type: 'winner', match: l(2 * k - 2, 0) }));
  return out;
}

export function generateBracket(teamCount: number, format: BracketFormat = 'single'): BracketMatch[] {
  if (!Number.isInteger(teamCount) || teamCount < 2) throw new BracketError('Mindestens 2 Teams nötig');
  return resolve(format === 'double' ? doubleBracket(teamCount) : singleBracket(teamCount, (r, s) => `r${r}-s${s}`, 'W'));
}

export function bracketFormat(bracket: BracketMatch[]): BracketFormat {
  return bracket.some((m) => m.section === 'F') ? 'double' : 'single';
}

function dependents(bracket: BracketMatch[], id: string): BracketMatch[] {
  return bracket.filter((m) => [m.srcA, m.srcB].some((s) => s && s.type !== 'team' && s.match === id));
}

function locked(bracket: BracketMatch[], m: BracketMatch): boolean {
  if (!m.isBye) return m.winner !== null;
  return dependents(bracket, m.id).some((d) => locked(bracket, d));
}

export function canChangeResult(bracket: BracketMatch[], id: string): boolean {
  const b = normalize(bracket);
  const m = b.find((x) => x.id === id);
  if (!m || m.isBye || m.teamA === null || m.teamB === null) return false;
  return !dependents(b, id).some((d) => locked(b, d));
}

export function setWinner(bracket: BracketMatch[], id: string, team: number): BracketMatch[] {
  const b = normalize(bracket);
  const m = b.find((x) => x.id === id);
  if (!m) throw new BracketError('Partie nicht gefunden');
  if (m.isBye) throw new BracketError('Freilos kann nicht gewertet werden');
  if (m.teamA === null || m.teamB === null) throw new BracketError('Partie hat noch nicht beide Teams');
  if (team !== m.teamA && team !== m.teamB) throw new BracketError('Team spielt nicht in dieser Partie');
  if (!canChangeResult(b, id)) throw new BracketError('Folgepartie ist bereits entschieden');
  return resolve(b.map((x) => (x.id === id ? { ...x, winner: team } : x)));
}

/** Das Endspiel: im Doppel-K.o. die Partie `F`, sonst die letzte Runde. */
export function finalMatch(bracket: BracketMatch[]): BracketMatch | undefined {
  const f = bracket.find((m) => sectionOf(m) === 'F');
  if (f) return f;
  const maxRound = Math.max(...bracket.map((m) => m.round));
  return bracket.find((m) => m.round === maxRound);
}

export function champion(bracket: BracketMatch[]): number | null {
  return finalMatch(bracket)?.winner ?? null;
}
