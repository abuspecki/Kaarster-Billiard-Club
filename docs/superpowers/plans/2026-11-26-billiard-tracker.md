# Billiard-Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile-first Website, auf der Freundesgruppen Billiard-Sitzungen live erfassen, Turniere mit K.o.-Baum spielen und pro Gruppe Rangliste und Statistiken sehen.

**Architecture:** Next.js (App Router) rendert Seiten serverseitig und ruft Supabase über Server Actions auf. Alle schreibenden Vorgänge laufen über Postgres-Funktionen (RPC, `security definer`) mit Rechteprüfung; Lesen ist über Row Level Security auf Gruppenmitglieder beschränkt. Fachlogik (Rangliste, Direktvergleich, Serien, Turnierbaum, Teamauslosung, Zusammenfassung) liegt als reine TypeScript-Funktionen in `lib/` und wird mit Vitest getestet; Statistiken werden immer aus den Partien berechnet.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS 4, `@supabase/supabase-js` + `@supabase/ssr`, Vitest, Postgres 16 (lokal nur für SQL-Tests), Hosting Vercel + Supabase.

**Spec:** `docs/superpowers/specs/2026-11-26-billiard-tracker-design.md`

## Global Constraints

- Oberfläche komplett auf Deutsch.
- Mobile first: jede Seite muss bei 375 px Breite ohne horizontales Scrollen bedienbar sein (Ausnahme: Turnierbaum darf horizontal scrollen).
- Ergebnis eintragen: Einzel = Gegner wählen → Gewinner antippen; Doppel höchstens ein Tipp mehr pro Seite. Keine Formularseiten dafür.
- Login: E-Mail + Passwort + Anzeigename.
- Gäste (nur Name) zählen in Sitzung und Zusammenfassung, **nicht** in Gruppen-Rangliste/Statistik.
- Team-/Doppelsiege zählen für **jedes** Teammitglied als Sieg (Niederlagen ebenso).
- Rangliste: Siege absteigend → Siegquote absteigend → Partien aufsteigend.
- Direktvergleich: nur Partien, in denen beide auf gegnerischen Seiten standen.
- Turnier: K.o., Freilose für die bestgesetzten Teams, Korrektur nur solange die Folgepartie keinen Sieger hat.
- Sitzung beenden: nur Ersteller oder Gruppen-Admin. Partien korrigieren/löschen: jeder Sitzungsteilnehmer mit Konto, nur in laufender Sitzung.
- Beitritt per Sitzungscode macht ein Konto automatisch zum Gruppenmitglied.
- Sitzungscode: 6 Zeichen, Gruppen-Einladungscode: 8 Zeichen, Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- Bewusst nicht bauen: Spielarten, Abzeichen, Elo, globale Rangliste, Punktestand/Fouls/Chat.

## Review Focus

1. **Zwei Handys tragen gleichzeitig ein Turnierergebnis ein** → der zweite Schreibvorgang wird abgelehnt („Stand hat sich geändert“) und die Seite lädt neu, statt einen Sieger still zu überschreiben. Test: Task 5 `tournament_version_conflict`.
2. **Ungerade Spielerzahl beim Auslosen** (5 Spieler, Teamgröße 2) → Teams 2/2/1, niemand fällt raus. Test: Task 4 `drawTeams deals leftover players`.
3. **Doppel Konto + Gast** → das Konto bekommt den Sieg in der Rangliste, der Gast taucht nicht auf. Test: Task 2 `excludes guests but credits their partner`.
4. **Turnierergebnis korrigieren, nachdem die nächste Runde gespielt ist** → abgelehnt. Test: Task 3 `rejects change when next match decided`.
5. **Fremder liest Daten einer anderen Gruppe / trägt in beendeter Sitzung ein** → leer bzw. Fehler. Test: Task 5 `rls_isolation`, `ended_session_rejects_match`.

---

## File Structure

```
app/
  layout.tsx, globals.css            Grundlayout, Kopfzeile
  login/page.tsx, register/page.tsx  Auth
  page.tsx                           Meine Gruppen, Gruppe anlegen, Code eingeben
  join/[code]/page.tsx               Link-Beitritt (Sitzung oder Gruppe)
  g/[groupId]/page.tsx               Rangliste, Sitzung starten, letzte Sitzungen, Einladen
  g/[groupId]/settings/page.tsx      Admin: umbenennen, Mitglieder, Code erneuern
  g/[groupId]/p/[userId]/page.tsx    Spielerprofil + Direktvergleich
  s/[sessionId]/page.tsx             Live-Sitzung
  s/[sessionId]/tournament/page.tsx  Teams auslosen + Turnierbaum
  s/[sessionId]/summary/page.tsx     Abend-Zusammenfassung
  actions/*.ts                       Server Actions (dünne RPC-Wrapper)
components/                          UI-Bausteine (MatchEntry, BracketView, RankingTable, …)
lib/
  code.ts        Codes erzeugen
  stats.ts       Rangliste, Direktvergleich, Serien
  bracket.ts     Turnierbaum
  teams.ts       Teamauslosung
  summary.ts     Abend-Zusammenfassung + Teiltext
  types.ts       gemeinsame Typen
  data.ts        DB-Zeilen → MatchRecord, Ladefunktionen
  supabase/server.ts, supabase/client.ts
middleware.ts                        Session-Refresh, Redirect auf /login
supabase/migrations/0001_init.sql
supabase/tests/00_stub_auth.sql, 10_*.sql
scripts/test-db.sh
tests/*.test.ts                      Vitest
README.md                            Einrichtung Supabase + Vercel
```

## Gemeinsame Typen (`lib/types.ts`, in Task 2 angelegt)

```ts
export type Side = 'A' | 'B';
/** "u:<user uuid>" für Konten, "g:<session_player uuid>" für Gäste */
export type PlayerKey = string;
export interface MatchRecord {
  id: string; playedAt: string; // ISO
  sideA: PlayerKey[]; sideB: PlayerKey[]; winner: Side;
}
export interface Standing {
  player: PlayerKey; wins: number; losses: number; played: number;
  winRate: number; // 0..1, 0 bei 0 Partien
  singlesWins: number; singlesLosses: number; teamWins: number; teamLosses: number;
}
```
Einzel = beide Seiten genau 1 Spieler; alles andere ist „Team“.

---

### Task 1: Projektgerüst + Codes

**Files:**
- Create: `package.json`, Next.js/Tailwind/Vitest-Konfiguration, `app/layout.tsx`, `app/globals.css`, `lib/code.ts`
- Test: `tests/code.test.ts`

**Interfaces:**
- Produces: `CODE_ALPHABET: string`, `generateCode(length: number, rng?: () => number): string`; npm-Skripte `dev`, `build`, `lint`, `test` (= `vitest run`), `test:db`.

- [ ] **Step 1:** `npx create-next-app@latest . --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"` (in leerem Repo; `docs/` vorher sichern, falls das Tool meckert), dann `npm i @supabase/supabase-js @supabase/ssr` und `npm i -D vitest`. `lang="de"` im Layout, Titel „Billiard-Tracker“.
- [ ] **Step 2: Failing test** `tests/code.test.ts`:
  - `generateCode(6)` hat Länge 6 und jedes Zeichen ∈ `CODE_ALPHABET`
  - `generateCode(8, () => 0)` === `'AAAAAAAA'`
  - `CODE_ALPHABET` enthält weder `0`, `O`, `1`, `I`
- [ ] **Step 3:** `npm test` → FAIL (Modul fehlt).
- [ ] **Step 4:** `lib/code.ts` implementieren.
- [ ] **Step 5:** `npm test` → PASS; `npm run build` → erfolgreich.
- [ ] **Step 6:** Commit `feat: scaffold Next.js app with code generator`.

### Task 2: Statistik (Rangliste, Direktvergleich, Serien)

**Files:**
- Create: `lib/types.ts`, `lib/stats.ts`
- Test: `tests/stats.test.ts`

**Interfaces:**
- Produces:
  - `computeStandings(matches: MatchRecord[], opts?: { includeGuests?: boolean }): Standing[]` — `includeGuests` default `false` (filtert Keys mit `g:`), sortiert nach Global Constraints.
  - `headToHead(matches: MatchRecord[], a: PlayerKey, b: PlayerKey): { aWins: number; bWins: number }`
  - `longestStreak(matches: MatchRecord[], opts?: { includeGuests?: boolean }): { player: PlayerKey; length: number } | null` — Matches nach `playedAt` sortiert auswerten; Serie = aufeinanderfolgende Siege des Spielers in *seinen* Partien; Gleichstand → wer die Serie zuerst erreicht hat. `includeGuests` default `false`.

- [ ] **Step 1: Failing tests:**
  - `counts singles and team results separately`: u:a schlägt u:b (Einzel); [u:a,u:c] schlägt [u:b,u:d] → u:a: wins 2, singlesWins 1, teamWins 1; u:b: losses 2.
  - `sorts by wins, then winRate, then fewer played`: Fixture mit u:x 2 Siege/0 Niederlagen, u:y 2/1, u:z 1/0, u:v 0/1, u:w 0/3 → Reihenfolge x, y, z, v, w (v vor w: gleiche Siege und Quote 0, weniger Partien).
  - `excludes guests but credits their partner`: [u:a, g:1] schlägt [u:b, u:c] → Standings enthält keinen `g:`-Key, u:a hat 1 Sieg; mit `includeGuests: true` erscheint `g:1`.
  - `headToHead counts only opposite sides`: u:a vs u:b 3× (a gewinnt 2), plus [u:a,u:b] als Team gegen u:c → `{aWins: 2, bWins: 1}`.
  - `longestStreak`: u:a gewinnt 3 hintereinander, verliert, gewinnt 1; u:b gewinnt 2 → `{player:'u:a', length:3}`; leere Liste → `null`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: standings, head-to-head and streak stats`.

### Task 3: Turnierbaum

**Files:**
- Create: `lib/bracket.ts`
- Test: `tests/bracket.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface BracketMatch {
    id: string;            // `r${round}-s${slot}`
    round: number;         // ab 1
    slot: number;          // ab 0
    teamA: number | null;  // Team-Index (0 = bestgesetzt)
    teamB: number | null;
    winner: number | null;
    isBye: boolean;
    matchId: string | null; // verknüpfte Zeile in `matches`
  }
  export class BracketError extends Error {}
  generateBracket(teamCount: number): BracketMatch[]
  setWinner(bracket: BracketMatch[], id: string, team: number): BracketMatch[] // pur, neue Liste
  canChangeResult(bracket: BracketMatch[], id: string): boolean
  champion(bracket: BracketMatch[]): number | null
  ```
- Algorithmus: `P` = kleinste Zweierpotenz ≥ n. Setzreihenfolge `seedOrder(P)`: Start `[1]`, solange Länge < P: `next = cur.flatMap(s => [s, 2*cur.length + 1 - s])` → für 8: `[1,8,4,5,2,7,3,6]`. Runde 1, Slot k = Setzplätze `order[2k]` vs `order[2k+1]` (Team-Index = Setzplatz − 1; Setzplatz > n = Freilos → `isBye: true`, `winner` = das vorhandene Team, sofort weitergereicht). Sieger von `(r, s)` wandert nach `(r+1, floor(s/2))`, gerades `s` → `teamA`, ungerades → `teamB`.

- [ ] **Step 1: Failing tests:**
  - `4 teams`: Runde 1 = `r1-s0: 0 vs 3`, `r1-s1: 1 vs 2`; insgesamt 3 Matches.
  - `5 teams`: 7 Matches; `r1-s0` Bye mit winner 0, `r1-s1: 3 vs 4`, `r1-s2` Bye winner 1, `r1-s3` Bye winner 2; `r2-s0: teamA 0, teamB null`; `r2-s1: 1 vs 2`.
  - `2 teams`: genau ein Match `r1-s0: 0 vs 1`.
  - `throws for fewer than 2 teams` → `BracketError`.
  - `setWinner advances winner`: 4 Teams, `setWinner(b,'r1-s0',3)` → `r2-s0.teamA === 3`.
  - `correction replaces advanced team`: danach `setWinner(…,'r1-s0',0)` → `r2-s0.teamA === 0`.
  - `rejects change when next match decided`: beide Halbfinals + Finale entschieden → `setWinner(…,'r1-s0',…)` wirft, `canChangeResult` = false.
  - `rejects team not in match` und `rejects setting a bye` → wirft.
  - `champion` = Sieger des letzten Matches, sonst `null`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: knockout bracket logic`.

### Task 4: Teamauslosung + Abend-Zusammenfassung

**Files:**
- Create: `lib/teams.ts`, `lib/summary.ts`
- Test: `tests/teams.test.ts`, `tests/summary.test.ts`

**Interfaces:**
- Consumes: `computeStandings`, `longestStreak` (Task 2).
- Produces:
  - `drawTeams(players: PlayerKey[], teamSize: number, rng?: () => number): PlayerKey[][]` — Fisher-Yates mischen, Teamanzahl = `ceil(n / teamSize)`, reihum verteilen (Größen unterscheiden sich max. um 1). Wirft `Error`, wenn Teamanzahl < 2 oder `teamSize < 1`.
  - `sessionSummary(matches: MatchRecord[]): { standings: Standing[]; playerOfNight: PlayerKey | null; longestStreak: { player: PlayerKey; length: number } | null }` — inkl. Gäste; Spieler des Abends = `standings[0]` falls ≥ 1 Partie.
  - `formatSummaryText(s: ReturnType<typeof sessionSummary>, names: Record<PlayerKey, string>, groupName: string, date: Date, tournamentWinner?: string): string`

- [ ] **Step 1: Failing tests:**
  - `drawTeams deals leftover players`: 5 Spieler, Größe 2 → 3 Teams mit Größen [2,2,1], alle Spieler genau einmal.
  - `drawTeams is deterministic with rng`: gleiche rng-Folge → gleiche Teams.
  - `drawTeams throws when only one team`: 2 Spieler, Größe 2 → wirft.
  - `summary picks player of the night and includes guests`: g:1 gewinnt 2, u:a 1 → `playerOfNight === 'g:1'`.
  - `formatSummaryText` enthält Gruppenname, Datum `26.11.2026`, `🏆 Spieler des Abends: <Name>`, je Spieler eine Zeile `<Name>: <S> Siege / <N> Niederlagen`, und bei `tournamentWinner` eine Zeile `Turniersieger: <Name>`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implementieren.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat: team draw and session summary`.

### Task 5: Datenbank (Schema, RLS, RPCs) + SQL-Tests

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `supabase/tests/00_stub_auth.sql`, `supabase/tests/10_rpc.sql`, `scripts/test-db.sh`

**Interfaces:**
- Produces Tabellen (alle `id uuid default gen_random_uuid()`, `created_at timestamptz default now()`):
  - `profiles(id → auth.users, display_name text not null)`; Trigger auf `auth.users` insert legt Profil aus `raw_user_meta_data->>'display_name'` an.
  - `groups(name, invite_code char(8) unique, created_by)`
  - `group_members(group_id, user_id, role text check in ('admin','member'), pk(group_id,user_id))`
  - `sessions(group_id, code char(6) unique, created_by, status text check in ('active','ended') default 'active', ended_at)`
  - `session_players(session_id, user_id null, guest_name null, check genau eins gesetzt, unique(session_id,user_id))`
  - `matches(session_id, group_id, winner_side text check in ('A','B'), created_by, tournament_id null)` — `replica identity full`
  - `match_players(match_id on delete cascade, session_player_id, side text, user_id null)` (user_id denormalisiert)
  - `tournaments(session_id, team_size int, teams jsonb /* uuid[][] von session_player ids */, bracket jsonb, status text check in ('running','finished'), version int default 0)`; partieller Unique-Index: max. ein `running` pro Sitzung.
- Helper: `is_group_member(gid uuid) returns boolean` (`security definer`, `stable`).
- RLS: Lesen auf allen Tabellen nur für Gruppenmitglieder (über `group_id` bzw. Join), `profiles` lesbar für Mitglieder gemeinsamer Gruppen und sich selbst. Direktes Schreiben gesperrt außer: `profiles` update eigenes, `groups` update `name` durch Admin.
- RPCs (`security definer`, `set search_path = public`, Fehler mit `raise exception` und deutscher Meldung):
  - `create_group(p_name text) returns uuid` — Ersteller wird `admin`.
  - `join_by_code(p_code text) returns jsonb` → `{kind:'session'|'group', id, group_id}`; upper-case; 6 Zeichen → Sitzung (nur `active`; Gruppenmitgliedschaft + `session_players` anlegen, idempotent), 8 Zeichen → Gruppe.
  - `start_session(p_group_id uuid) returns uuid` — Ersteller wird Sitzungsteilnehmer.
  - `add_guest(p_session_id uuid, p_name text) returns uuid`
  - `record_match(p_session_id uuid, p_side_a uuid[], p_side_b uuid[], p_winner text) returns uuid` — Seiten gleich groß, 1 oder 2, disjunkt, alle aus dieser Sitzung.
  - `update_match(p_match_id uuid, p_side_a uuid[], p_side_b uuid[], p_winner text)`, `delete_match(p_match_id uuid)` — nicht für Turnierpartien.
  - `end_session(p_session_id uuid)` — Ersteller oder Admin.
  - `create_tournament(p_session_id uuid, p_team_size int, p_teams jsonb, p_bracket jsonb) returns uuid`
  - `record_tournament_result(p_tournament_id uuid, p_expected_version int, p_bracket jsonb, p_bracket_match_id text, p_finished boolean) returns int` — prüft `version = p_expected_version` (sonst Exception `'Stand hat sich geändert'`), legt für `p_bracket_match_id` eine `matches`-Zeile an bzw. aktualisiert sie (Seiten aus `teams`, Sieger aus `p_bracket`), schreibt die `matchId` in den gespeicherten Bracket-Eintrag, erhöht `version`, gibt neue Version zurück.
  - `remove_member(p_group_id uuid, p_user_id uuid)`, `regenerate_invite(p_group_id uuid) returns text` — nur Admin.
  - Rechte für Partien/Turnier: Aufrufer ist `session_players.user_id` der Sitzung **und** Sitzung `active`.
  - Codes werden in SQL erzeugt (gleiches Alphabet wie `lib/code.ts`), Kollision → neu würfeln.
- `alter publication supabase_realtime add table sessions, session_players, matches, tournaments;`

- [ ] **Step 1:** `00_stub_auth.sql`: Schema `auth`, `auth.users(id uuid pk, raw_user_meta_data jsonb)`, `auth.uid()` = `nullif(current_setting('request.jwt.claim.sub', true),'')::uuid`, Rollen `anon`/`authenticated`, `create publication supabase_realtime`.
- [ ] **Step 2:** `scripts/test-db.sh`: temporären Cluster mit `/usr/lib/postgresql/16/bin/initdb` anlegen (als root via `runuser -u postgres`), starten, Stub → Migration → `supabase/tests/1*.sql` mit `psql -v ON_ERROR_STOP=1` laden, Cluster entfernen; Exit-Code ≠ 0 bei Fehler. `npm run test:db` zeigt darauf.
- [ ] **Step 3: Failing tests** in `10_rpc.sql` (je ein `DO`-Block, Nutzerwechsel über `set local role authenticated; set local request.jwt.claim.sub = '…'`):
  - `group_flow`: A legt Gruppe an → A ist admin; B tritt per Invite-Code bei → member.
  - `session_join_adds_membership`: C (kein Mitglied) tritt per Sitzungscode bei → ist Gruppenmitglied und Sitzungsteilnehmer.
  - `record_doubles_with_guest`: Gast anlegen, Doppel [A, Gast] vs [B, C] → 4 `match_players`-Zeilen, Gast-Zeile mit `user_id null`.
  - `rejects_unequal_sides` und `rejects_player_from_other_session`.
  - `rls_isolation`: D (fremd) sieht 0 Zeilen in `groups`, `matches`, `sessions`.
  - `ended_session_rejects_match`: nach `end_session` wirft `record_match`; `end_session` durch Nicht-Ersteller-Nicht-Admin wirft.
  - `tournament_version_conflict`: zwei Aufrufe mit `p_expected_version = 0` → zweiter wirft `Stand hat sich geändert`.
- [ ] **Step 4:** `npm run test:db` → FAIL.
- [ ] **Step 5:** Migration schreiben.
- [ ] **Step 6:** `npm run test:db` → PASS.
- [ ] **Step 7:** Commit `feat: database schema, RLS and RPCs`.

### Task 6: Supabase-Anbindung, Auth, Layout

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`, `app/login/page.tsx`, `app/register/page.tsx`, `app/actions/auth.ts`, `.env.example`

**Interfaces:**
- Produces: `createServerSupabase(): Promise<SupabaseClient>` (Cookies via `@supabase/ssr`), `createBrowserSupabase(): SupabaseClient`, `requireUser(): Promise<{ id: string; displayName: string }>` (redirect `/login`). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Middleware: Session refresh; nicht eingeloggt → `/login?next=<pfad>` außer `/login`, `/register`. Nach Login zurück zu `next` (damit Einladungslinks funktionieren).
- Registrieren: E-Mail, Passwort (min. 8), Anzeigename → `signUp` mit `options.data.display_name`. Kopfzeile: App-Name, Anzeigename, Abmelden.

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2:** `npm run build` und `npm run lint` → ohne Fehler (mit Dummy-Env aus `.env.example`).
- [ ] **Step 3:** Commit `feat: supabase auth and layout`.

### Task 7: Gruppen, Rangliste, Beitreten, Einstellungen, Spielerprofil

**Files:**
- Create: `lib/data.ts`, `app/page.tsx`, `app/join/[code]/page.tsx`, `app/g/[groupId]/page.tsx`, `app/g/[groupId]/settings/page.tsx`, `app/g/[groupId]/p/[userId]/page.tsx`, `app/actions/groups.ts`, `components/RankingTable.tsx`, `components/CodeInput.tsx`
- Test: `tests/data.test.ts`

**Interfaces:**
- Consumes: RPCs aus Task 5, `computeStandings`, `headToHead`, `longestStreak`.
- Produces in `lib/data.ts`:
  - `toMatchRecords(rows: { id: string; created_at: string; winner_side: 'A'|'B'; match_players: { side: 'A'|'B'; user_id: string | null; session_player_id: string }[] }[]): MatchRecord[]` (pur; `u:`/`g:`-Keys)
  - `loadGroupMatches(sb, groupId): Promise<MatchRecord[]>`, `loadSessionMatches(sb, sessionId): Promise<MatchRecord[]>`, `loadNames(sb, groupId, sessionId?): Promise<Record<PlayerKey,string>>`
- Startseite: Gruppenliste, „Gruppe anlegen“, ein Code-Feld (6 oder 8 Zeichen → `join_by_code` → weiter zur Sitzung/Gruppe). `/join/[code]` macht dasselbe direkt.
- Gruppenseite: großer Knopf „Sitzung starten“, laufende Sitzungen oben, Rangliste (Platz, Name, Siege, Quote in %), letzte 10 Sitzungen, „Freunde einladen“ (Link `/join/<invite_code>` per Web Share API, Fallback Kopieren).
- Spielerprofil: Siege/Niederlagen/Quote/Partien, Einzel vs. Team getrennt, Liste „Gegen <Name>: x : y“ für jedes Mitglied mit ≥ 1 Duell.
- Einstellungen nur für Admin sichtbar.

- [ ] **Step 1: Failing test** `toMatchRecords maps users and guests`: Zeile mit Spieler `user_id 'x'` Seite A und Gast (`user_id null`, `session_player_id 'p'`) Seite B → `sideA ['u:x']`, `sideB ['g:p']`.
- [ ] **Step 2:** `npm test` → FAIL; implementieren; `npm test` → PASS.
- [ ] **Step 3:** Seiten implementieren; `npm run build` → ohne Fehler.
- [ ] **Step 4:** Commit `feat: groups, ranking, join and player profile`.

### Task 8: Live-Sitzung

**Files:**
- Create: `app/s/[sessionId]/page.tsx`, `app/actions/session.ts`, `components/SessionLive.tsx` (client), `components/MatchEntry.tsx`, `components/MatchList.tsx`, `lib/useRealtimeRefresh.ts`

**Interfaces:**
- Consumes: `record_match`, `update_match`, `delete_match`, `add_guest`, `end_session`, `join_by_code`.
- Produces: `useRealtimeRefresh(sessionId: string): void` — abonniert `postgres_changes` auf `sessions`, `session_players`, `matches`, `tournaments` mit Filter `session_id=eq.<id>` (bzw. `id=eq.<id>` für `sessions`) und ruft `router.refresh()` (gedrosselt auf 300 ms).
- Seite: Kopf mit Code + Teilen; Spielerleiste (+ Gast hinzufügen); großer Knopf „+ Partie“ öffnet `MatchEntry`: Umschalter Einzel/Doppel, Spieler-Chips für Seite A und B, dann zwei große Knöpfe „<Name(n)> gewinnt“ → speichert sofort. Liste der Partien (neueste oben, „eingetragen von …“), Antippen → korrigieren/löschen. Knöpfe „Turnier“ und (für Ersteller/Admin) „Sitzung beenden“ → Weiterleitung zur Zusammenfassung. Ist der Nutzer Mitglied, aber kein Teilnehmer: Knopf „Mitspielen“. Beendete Sitzung → nur Lesen + Link zur Zusammenfassung.
- Vorauswahl in `MatchEntry`: zuletzt eingetragener Spieler auf Seite A (spart Tipps).

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2:** `npm run build`, `npm run lint`, `npm test` → ohne Fehler.
- [ ] **Step 3:** Commit `feat: live session with match entry`.

### Task 9: Turnier

**Files:**
- Create: `app/s/[sessionId]/tournament/page.tsx`, `app/actions/tournament.ts`, `components/TeamDraw.tsx`, `components/BracketView.tsx`

**Interfaces:**
- Consumes: `drawTeams`, `generateBracket`, `setWinner`, `canChangeResult`, `champion`, RPCs `create_tournament`, `record_tournament_result`, `useRealtimeRefresh`.
- Ablauf ohne laufendes Turnier: Teilnehmer an-/abwählen (Standard: alle), Teamgröße 1–4, „Auslosen“ / „Neu mischen“, Spieler per Antippen zwischen Teams verschieben, „Turnier starten“ → `create_tournament` mit `generateBracket(teams.length)`.
- Mit Turnier: `BracketView` zeigt Runden als Spalten (horizontal scrollbar), Teamnamen = Spielernamen mit „ + “. Antippen eines Matches mit zwei Teams → zwei Knöpfe „<Team> gewinnt“; Server Action rechnet `setWinner` gegen den **aktuell geladenen** Bracket und ruft `record_tournament_result` mit dessen `version`; bei `Stand hat sich geändert` Hinweis + `router.refresh()`. `p_finished = champion(...) !== null`. Gesperrte Matches (`!canChangeResult`) nicht antippbar. Turniersieger groß oben anzeigen.

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2:** `npm run build`, `npm run lint`, `npm test` → ohne Fehler.
- [ ] **Step 3:** Commit `feat: tournament team draw and bracket`.

### Task 10: Abend-Zusammenfassung, README, Gesamtprüfung

**Files:**
- Create: `app/s/[sessionId]/summary/page.tsx`, `components/ShareButton.tsx`, `README.md`

**Interfaces:**
- Consumes: `sessionSummary`, `formatSummaryText`, `loadSessionMatches`, `loadNames`, `champion`.
- Seite: Spieler des Abends groß, längste Serie, Tabelle aller Teilnehmer (inkl. Gäste, mit „Gast“-Kennzeichen), ggf. Turniersieger; „Teilen“ → `navigator.share({ text })`, Fallback Zwischenablage mit „Kopiert!“.
- README (Deutsch): Was die App kann; Einrichtung Schritt für Schritt: Supabase-Projekt anlegen → SQL aus `supabase/migrations/0001_init.sql` im SQL-Editor ausführen → unter Auth „Confirm email“ nach Wunsch → URL/Anon-Key kopieren; Vercel: Repo importieren, die zwei Env-Variablen setzen, deployen; in Supabase Auth die Site-URL auf die Vercel-Adresse setzen. Lokale Entwicklung + Tests.

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2:** Gesamtprüfung: `npm test`, `npm run test:db`, `npm run lint`, `npm run build` → alle grün.
- [ ] **Step 3:** Commit `feat: session summary and setup guide`.
