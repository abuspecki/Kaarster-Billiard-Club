import { computeStandings, longestStreak } from './stats';
import type { MatchRecord, PlayerKey, Standing } from './types';

export interface SessionSummary {
  standings: Standing[];
  playerOfNight: PlayerKey | null;
  longestStreak: { player: PlayerKey; length: number } | null;
}

export function sessionSummary(matches: MatchRecord[]): SessionSummary {
  const standings = computeStandings(matches, { includeGuests: true });
  return {
    standings,
    playerOfNight: standings[0]?.played ? standings[0].player : null,
    longestStreak: longestStreak(matches, { includeGuests: true }),
  };
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function formatSummaryText(
  s: SessionSummary,
  names: Record<PlayerKey, string>,
  groupName: string,
  date: Date,
  tournamentWinner?: string,
): string {
  const name = (p: PlayerKey) => names[p] ?? 'Unbekannt';
  const day = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
  const lines = [`🎱 ${groupName} – ${day}`];
  if (s.playerOfNight) lines.push(`🏆 Spieler des Abends: ${name(s.playerOfNight)}`);
  if (tournamentWinner) lines.push(`Turniersieger: ${tournamentWinner}`);
  if (s.longestStreak && s.longestStreak.length > 1) {
    lines.push(`🔥 Längste Serie: ${name(s.longestStreak.player)} (${s.longestStreak.length} Siege am Stück)`);
  }
  lines.push('');
  for (const st of s.standings) {
    lines.push(`${name(st.player)}: ${plural(st.wins, 'Sieg', 'Siege')} / ${plural(st.losses, 'Niederlage', 'Niederlagen')}`);
  }
  return lines.join('\n');
}
