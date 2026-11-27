# Doppel-K.o., Spielreihenfolge und Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turnierart K.o./Doppel-K.o., abgeleitete Spielreihenfolge („Jetzt am Tisch“/„Danach“) mit Pausen-Berücksichtigung und Web-Push „Du bist dran“/„Du bist gleich dran“.

**Architecture:** `lib/bracket.ts` wird zu einer Graph-Logik (jede Partie hat Quellen), die einfaches und doppeltes K.o. abdeckt und alte gespeicherte Bäume weiter versteht. `lib/queue.ts` leitet die Reihenfolge ab. Push: Tabelle `push_subscriptions`, Datenbank-Funktion `claim_push_targets` (Dedupe + Abos), Versand mit `web-push` nach dem Speichern über `after()`.

**Tech Stack:** Next.js 15 (`after` aus `next/server`), Supabase/Postgres, `web-push`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-double-elim-queue-push-design.md`

## Global Constraints
- Finale im Doppel-K.o.: **ein einziges Spiel**, kein Bracket-Reset.
- Bei gleicher Welle: **Verliererrunde vor Gewinnerrunde**; Finale zuletzt.
- Alte K.o.-Bäume (IDs `r{r}-s{s}`, ohne Quellen) bleiben lesbar und bearbeitbar; bestehende Bracket-Tests bleiben grün.
- Push nie blockierend; jede Benachrichtigung pro Turnier+Partie+Art höchstens einmal.
- Privater VAPID-Schlüssel nur als geheimer Vercel-Wert, nie im Repo.
- Oberfläche Deutsch, Sport-Design-Tokens.

## Review Focus
1. **Freilos-Ketten im Doppel-K.o.** (z. B. 5 oder 6 Teams): Verliererrunde mit fehlenden Verlierern reicht korrekt durch, kein Spiel „gegen niemand“ in der Reihenfolge. Test Task 2 `double 5/6 teams has no playable match against nobody`.
2. **Korrektur nach Abstieg**: W-Partie ändern, deren Verlierer schon in einer entschiedenen L-Partie gespielt hat → abgelehnt. Test Task 2 `locks result when loser path decided`.
3. **Alle Partien eines Spielers pausiert** → Reihenfolge überspringt, „Jetzt dran“ ist eine andere Partie oder leer. Test Task 3.
4. **Doppelte Push** bei zwei schnellen Einträgen / Korrektur hin und zurück → nur einmal je Partie+Art. SQL-Test Task 4 `claim twice returns nothing second time`.
5. **Abgelaufenes Abo** (410) → wird entfernt, Versand an andere läuft weiter. Code-Review Task 6 (nicht automatisiert testbar ohne Push-Dienst).

---

### Task 1: Graph-Turnierbaum (einfaches K.o.)

**Files:** Modify `lib/bracket.ts`, `tests/bracket.test.ts`.

**Interfaces — Produces:**
```ts
export type Source = { type: 'team'; team: number | null } | { type: 'winner' | 'loser'; match: string };
export type Section = 'W' | 'L' | 'F';
export interface BracketMatch {
  id: string; round: number; slot: number; section?: Section; // fehlt = 'W' (alte Bäume)
  teamA: number | null; teamB: number | null; winner: number | null; isBye: boolean; matchId: string | null;
  srcA?: Source; srcB?: Source; // fehlt bei alten Bäumen → per normalize() abgeleitet
}
export type BracketFormat = 'single' | 'double';
generateBracket(teamCount: number, format?: BracketFormat /* 'single' */): BracketMatch[]
normalize(bracket: BracketMatch[]): BracketMatch[]   // ergänzt Quellen alter Bäume und löst neu auf
resolve(bracket: BracketMatch[]): BracketMatch[]     // Teams/Freilose/Sieger aus Quellen neu berechnen
setWinner / canChangeResult / champion (Signaturen wie bisher)
bracketFormat(bracket): BracketFormat               // 'double', wenn eine Partie section 'F' hat
```
- `resolve`: Quellen → Team | *ausstehend* | *abwesend*. Eine Seite abwesend, andere Team → Freilos (Sieger = Team). Beide abwesend → leere Partie (isBye, keine Teams, Sieger/Verlierer abwesend). Verlierer eines Freiloses = abwesend. Manuelle Sieger bleiben, solange sie in der Partie stehen.
- `canChangeResult`: kein Freilos, beide Teams, und keine abhängige Partie (Quelle winner/loser = diese Partie) ist gesperrt; gesperrt = Nicht-Freilos mit Sieger oder Freilos mit gesperrter Abhängiger.
- Einfaches K.o.: IDs `r{r}-s{s}` wie bisher, Runde 1 mit `team`-Quellen nach `seedOrder`.

- [ ] Step 1: Bestehende Tests laufen lassen (grün als Ausgangspunkt). Neue failing Tests: `normalize` an altem Baum ohne `srcA` (aus `generateBracket(4)` mit entfernten Quellen) → `setWinner` funktioniert identisch; `resolve` idempotent.
- [ ] Step 2: FAIL. Step 3: implementieren. Step 4: alle Bracket-Tests PASS. Step 5: Commit `refactor(bracket): graph-based bracket`.

### Task 2: Doppel-K.o.

**Files:** `lib/bracket.ts`, `tests/bracket.test.ts`.
- IDs `W{r}-{s}`, `L{r}-{s}`, `F`. P = 2^k ≥ n. W wie einfaches K.o.
- k = 1: F = Sieger W1-0 gegen Verlierer W1-0.
- k ≥ 2: L1 (P/4): Verlierer W1-2s gegen Verlierer W1-(2s+1). Für j = 1..k-1: L(2j) (P/2^(j+1) Partien): Sieger L(2j-1)-s gegen Verlierer W(j+1)-(size-1-s); falls j < k-1: L(2j+1) (P/2^(j+2)): Sieger L(2j)-2s gegen Sieger L(2j)-(2s+1). F: Sieger W k-0 gegen Sieger L(2k-2)-0.
- [ ] Failing Tests:
  - `double 4 teams`: 6 Partien (W1-0, W1-1, W2-0, L1-0, L2-0, F); nach W1-0→0, W1-1→1: `L1-0` = 3 vs 2; nach W2-0→0, L1-0→2: `L2-0` = 2 vs 1; nach L2-0→1: `F` = 0 vs 1; `champion` nach F.
  - `double 2 teams`: W1-0 + F; F = Sieger vs Verlierer von W1-0.
  - `double 5/6 teams has no playable match against nobody`: in allen Zuständen, die durch zufälliges Spielen (fester Seed) entstehen, hat jede nicht-Freilos-Partie mit Sieger zwei Teams; Spiel endet mit Champion; jedes Team verliert höchstens zweimal.
  - `double 8 teams` vollständig durchspielen → genau ein Champion, Zahl der gespielten Partien = 2n−2.
  - `locks result when loser path decided`: 4 Teams, W1-0, W1-1, L1-0 entschieden → `canChangeResult('W1-0') === false`.
  - `bracketFormat` erkennt single/double.
- [ ] FAIL → implementieren → PASS. Commit `feat(bracket): double elimination`.

### Task 3: Spielreihenfolge

**Files:** Create `lib/queue.ts`, `tests/queue.test.ts`.
**Produces:**
```ts
export interface QueueEntry { match: BracketMatch; wave: number; waitingForPause: boolean }
playQueue(bracket: BracketMatch[], pausedTeams?: Set<number>): BracketMatch[] // spielbar, sortiert
nowAndNext(bracket, pausedTeams?): { now: BracketMatch | null; next: BracketMatch | null; paused: BracketMatch[] }
pausedTeamIndexes(teams: string[][], pausedPlayerIds: Set<string>): Set<number> // Team pausiert, wenn ein Spieler pausiert
```
Welle = 1 + max(Welle der Quell-Partien), Team-Quellen = 0. Sortierung: Welle ↑, L vor W, F zuletzt, Slot ↑.
- [ ] Failing Tests: Doppel 4 Teams Start → now W1-0, next W1-1; nach beiden W1 → now L1-0 (L vor W2-0), next W2-0; pausiertes Team 3 → L1-0 übersprungen, now W2-0, `paused` enthält L1-0; einfaches K.o. 4 Teams → r1-s0, r1-s1; fertiges Turnier → now null; `pausedTeamIndexes([['a'],['b','c']], new Set(['c']))` → {1}.
- [ ] FAIL → implementieren → PASS. Commit `feat: play queue`.

### Task 4: Datenbank für Push

**Files:** Create `supabase/migrations/0005_push.sql`; Modify `supabase/tests/10_rpc.sql`.
**Produces:**
- `push_subscriptions(id uuid pk, user_id uuid → profiles on delete cascade, endpoint text unique not null, p256dh text not null, auth text not null, created_at)`; RLS: select/delete eigene.
- `push_notifications(tournament_id → tournaments on delete cascade, bracket_match_id text, kind text check in ('now','next'), created_at, pk(tournament_id, bracket_match_id, kind))`; kein Lesezugriff.
- `save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void` (upsert per endpoint, user = auth.uid()).
- `remove_push_subscription(p_endpoint text) returns void` (löscht per endpoint; für Aufräumen nach 404/410).
- `claim_push_targets(p_tournament_id uuid, p_bracket_match_id text, p_kind text) returns table(endpoint text, p256dh text, auth text)` — `assert_session_writer` der Turnier-Sitzung; Teams der Partie aus dem **gespeicherten** Bracket; insert in `push_notifications` on conflict do nothing; nur wenn eingefügt: Abos aller Nutzer der beiden Teams.
- [ ] Failing SQL-Tests: A speichert Abo; B sieht es nicht; claim für Turnier-Partie liefert A's Abo beim ersten Mal, beim zweiten Mal 0 Zeilen; D (fremd) → Fehler; `remove_push_subscription` entfernt.
- [ ] FAIL → Migration → PASS. Commit `feat: push subscriptions in database`.

### Task 5: Oberfläche Turnier und Reihenfolge

**Files:** `components/TeamDraw.tsx` (Umschalter K.o./Doppel-K.o.), `app/actions/tournament.ts` (`createTournament(sessionId, teamSize, teams, format)`; `normalize` vor `setWinner`), `components/BracketView.tsx` (Abschnitte Gewinnerrunde / Verliererrunde / Finale; Rundennamen; leere Partien ausblenden), Create `components/sport/NowPlaying.tsx` (`{ now: {a: string; b: string; aKey?: PlayerKey; bKey?: PlayerKey} | null; next: … | null; pausedCount: number; href?: string }`), `components/TournamentLive.tsx` und `components/SessionLive.tsx` + `app/s/[sessionId]/page.tsx` (laufendes Turnier laden, NowPlaying oben), `app/dev/preview/page.tsx` (Doppel-K.o.-Beispiel).
- [ ] Build/lint/test grün; Vorschau-Screenshot hell/dunkel ansehen. Commit `feat: double elimination UI and now playing`.

### Task 6: Push im Browser und Versand

**Files:** `npm i web-push` + `@types/web-push`; Create `public/sw.js`, `components/PushToggle.tsx`, `app/actions/push.ts` (`savePushSubscription(sub)`, `removePushSubscription(endpoint)`), `lib/push.ts` (`notifyQueue(sb, tournamentId, bracket, teams, names, pausedTeams)` – berechnet now/next, ruft `claim_push_targets`, sendet mit `web-push`, entfernt 404/410); Modify `app/actions/tournament.ts` (nach Erfolg `after(() => notifyQueue(...))`), `middleware.ts` (sw.js ausnehmen), `.env.example` (VAPID-Variablen).
- PushToggle: nur sichtbar, wenn `serviceWorker` + `PushManager` vorhanden; iOS ohne Standalone → Hinweis „Zum Home-Bildschirm hinzufügen, dann hier einschalten“; Zustände aus/an/blockiert.
- [ ] Build/lint/test grün. Commit `feat: web push for your turn`.

### Task 7: Live gehen
- [ ] VAPID-Schlüssel erzeugen; Vercel-Werte setzen (`NEXT_PUBLIC_VAPID_PUBLIC_KEY` plain, `VAPID_PRIVATE_KEY` sensitive, `VAPID_SUBJECT` = `https://kaarster-billiard-club.vercel.app`).
- [ ] Migration 0005 per Supabase-Tool einspielen; Sicherheits-Advisor prüfen.
- [ ] Gesamtprüfung, abschließender Review, `main` aktualisieren, Produktions-Deployment anstoßen.
