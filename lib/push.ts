import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import * as webpush from 'web-push';
import { normalize, type BracketMatch } from './bracket';
import { nowAndNext, pausedTeamIndexes } from './queue';
import { teamName, type TournamentPlayer } from './tournament-view';

let configured: boolean | undefined;
function configure(): boolean {
  if (configured !== undefined) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://kaarster-billiard-club.vercel.app', pub!, priv!);
  return configured;
}

type Target = { endpoint: string; p256dh: string; auth: string };

async function send(sb: SupabaseClient, targets: Target[], payload: object) {
  await Promise.all(
    targets.map(async (t) => {
      try {
        await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(payload), { TTL: 600 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await sb.rpc('remove_push_subscription', { p_endpoint: t.endpoint }); // Abo abgelaufen
      }
    }),
  );
}

/**
 * Benachrichtigt die Spieler der Partie, die jetzt dran ist, und der danach.
 * Wird nach dem Speichern aufgerufen; Fehler werden geschluckt, damit das Eintragen nie hängt.
 */
export async function notifyQueue(sb: SupabaseClient, tournamentId: string): Promise<void> {
  if (!configure()) return;
  try {
    const { data: t } = await sb.from('tournaments').select('id, session_id, status, teams, bracket').eq('id', tournamentId).maybeSingle();
    if (!t || t.status !== 'running') return;
    const { data: rows } = await sb
      .from('session_players')
      .select('id, user_id, guest_name, paused, profiles(display_name)')
      .eq('session_id', t.session_id);
    const players = ((rows ?? []) as unknown as {
      id: string; user_id: string | null; guest_name: string | null; paused: boolean; profiles: { display_name: string } | null;
    }[]).map((p) => ({ id: p.id, userId: p.user_id, name: p.profiles?.display_name ?? p.guest_name ?? '?', paused: p.paused }));
    const teams = t.teams as string[][];
    const bracket = normalize(t.bracket as BracketMatch[]);
    const q = nowAndNext(bracket, pausedTeamIndexes(teams, new Set(players.filter((p) => p.paused).map((p) => p.id))));
    const label = (m: BracketMatch) => `${teamName(teams, m.teamA!, players as TournamentPlayer[])} gegen ${teamName(teams, m.teamB!, players as TournamentPlayer[])}`;
    const url = `/s/${t.session_id}/tournament`;

    const jobs: Promise<void>[] = [];
    for (const [m, kind] of [[q.now, 'now'], [q.next, 'next']] as const) {
      if (!m) continue;
      jobs.push(
        (async () => {
          const { data: targets } = await sb.rpc('claim_push_targets', { p_tournament_id: t.id, p_bracket_match_id: m.id, p_kind: kind });
          if (!targets?.length) return;
          await send(sb, targets as Target[], {
            title: kind === 'now' ? '🎱 Du bist dran!' : '⏳ Du bist gleich dran',
            body: kind === 'now' ? `${label(m)} – ab an den Tisch.` : `${label(m)} kommt als Nächstes.`,
            url,
            tag: `${t.id}-${m.id}`,
          });
        })(),
      );
    }
    await Promise.all(jobs);
  } catch {
    // Push ist Zusatz – niemals das Eintragen stören.
  }
}
