import type { PlayerKey } from './types';

export function drawTeams(players: PlayerKey[], teamSize: number, rng: () => number = Math.random): PlayerKey[][] {
  if (!Number.isInteger(teamSize) || teamSize < 1) throw new Error('Teamgröße muss mindestens 1 sein');
  const teamCount = Math.ceil(players.length / teamSize);
  if (teamCount < 2) throw new Error('Zu wenige Spieler für mindestens 2 Teams');

  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const teams: PlayerKey[][] = Array.from({ length: teamCount }, () => []);
  shuffled.forEach((p, i) => teams[i % teamCount].push(p));
  return teams;
}
