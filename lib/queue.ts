import { normalize, type BracketMatch } from './bracket';

/** Welle = frühester Zeitpunkt, zu dem eine Partie spielbar sein kann (Länge des längsten Vorgängerpfads). */
function waves(bracket: BracketMatch[]): Map<string, number> {
  const byId = new Map(bracket.map((m) => [m.id, m]));
  const memo = new Map<string, number>();
  const wave = (m: BracketMatch): number => {
    const cached = memo.get(m.id);
    if (cached !== undefined) return cached;
    let w = 1;
    for (const s of [m.srcA, m.srcB]) if (s && s.type !== 'team') w = Math.max(w, wave(byId.get(s.match)!) + 1);
    memo.set(m.id, w);
    return w;
  };
  bracket.forEach(wave);
  return memo;
}

function ready(bracket: BracketMatch[]): BracketMatch[] {
  const b = normalize(bracket);
  const w = waves(b);
  // Finale zuletzt, sonst nach Welle; bei gleicher Welle Verliererrunde vor Gewinnerrunde.
  const key = (m: BracketMatch) => [m.section === 'F' ? 1 : 0, w.get(m.id)!, m.section === 'L' ? 0 : 1, m.slot];
  const cmp = (x: BracketMatch, y: BracketMatch) => {
    const a = key(x);
    const c = key(y);
    for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) return a[i] - c[i];
    return 0;
  };
  return b.filter((m) => !m.isBye && m.winner === null && m.teamA !== null && m.teamB !== null).sort(cmp);
}

/** Spielbare Partien in Reihenfolge (ohne pausierte Teams). */
export function playQueue(bracket: BracketMatch[], pausedTeams: Set<number> = new Set()): BracketMatch[] {
  return ready(bracket).filter((m) => !pausedTeams.has(m.teamA!) && !pausedTeams.has(m.teamB!));
}

export function nowAndNext(
  bracket: BracketMatch[],
  pausedTeams: Set<number> = new Set(),
): { now: BracketMatch | null; next: BracketMatch | null; paused: BracketMatch[] } {
  const all = ready(bracket);
  const queue = all.filter((m) => !pausedTeams.has(m.teamA!) && !pausedTeams.has(m.teamB!));
  return {
    now: queue[0] ?? null,
    next: queue[1] ?? null,
    paused: all.filter((m) => pausedTeams.has(m.teamA!) || pausedTeams.has(m.teamB!)),
  };
}

/** Ein Team gilt als pausiert, sobald einer seiner Spieler pausiert ist. */
export function pausedTeamIndexes(teams: string[][], pausedPlayerIds: Set<string>): Set<number> {
  return new Set(teams.flatMap((t, i) => (t.some((id) => pausedPlayerIds.has(id)) ? [i] : [])));
}
