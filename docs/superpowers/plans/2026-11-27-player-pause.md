# Spieler pausieren Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Spieler in einer laufenden Sitzung pausieren und zurückholen.
**Architecture:** Neue Spalte + RPC in Migration 0003; reine Sortierfunktion für die Eintragen-Liste; UI in SessionLive/MatchEntry/TeamDraw.
**Tech Stack:** Postgres/Supabase, Next.js, Vitest.
**Spec:** `docs/superpowers/specs/2026-11-27-player-pause-design.md`

## Global Constraints
- Rechte wie `record_match`: Gruppenmitglied + Teilnehmer mit Konto + Sitzung `active`.
- Keine Änderung an Statistik/Rangliste.

## Review Focus
1. Pausierter Spieler in beendeter Sitzung umschalten → Fehler „Sitzung ist beendet“. Test Task 1.
2. Fremder/Nicht-Teilnehmer schaltet um → Fehler. Test Task 1.
3. Spieler-ID aus anderer Sitzung → Fehler. Test Task 1.
4. Alle Spieler pausiert → Eintragen zeigt trotzdem alle (ausgegraut). Test Task 2.
5. Auslosung mit pausierten → nicht vorausgewählt, manuell wählbar. Manuell geprüft (Build + Vorschau).

### Task 1: Datenbank
**Files:** Create `supabase/migrations/0003_player_pause.sql`; Modify `supabase/tests/10_rpc.sql`.
**Produces:** `session_players.paused boolean not null default false`; `set_player_paused(p_session_player_id uuid, p_paused boolean) returns void` (security definer, `assert_session_writer` der Sitzung des Spielers; `grant execute … to authenticated`).
- [ ] Failing SQL tests: A pausiert Gast → `paused = true`; zurück → false; D (fremd) → Fehler „Du bist kein“; nach `end_session` → Fehler „beendet“; unbekannte ID → Fehler „nicht gefunden“.
- [ ] `npm run test:db` FAIL → Migration → PASS. Commit.

### Task 2: Sortierung fürs Eintragen
**Files:** Create in `lib/match-entry.ts`: `orderForEntry<T extends { id: string; paused: boolean }>(players: T[]): T[]` – aktive zuerst, pausierte danach, Reihenfolge sonst stabil. Test `tests/match-entry.test.ts`.
- [ ] Failing test (gemischt; alle pausiert → gleiche Länge, gleiche Reihenfolge) → implementieren → PASS. Commit.

### Task 3: Oberfläche
**Files:** `lib/session-data.ts` (`SessionPlayer.paused: boolean`), `app/actions/session.ts` (`setPlayerPaused(sessionId, playerId, paused)`), `components/SessionLive.tsx` (Spieler-Chip antippbar → Menü Pause/Zurück, ⏸-Abzeichen), `components/MatchEntry.tsx` (`orderForEntry`, pausierte `opacity-50` + „Pause“), `components/TeamDraw.tsx` (Vorauswahl ohne pausierte), `app/dev/preview/page.tsx` (Beispiel-Spieler `paused`).
- [ ] `npm test`, `npm run lint`, `npm run build` grün. Commit.
- [ ] Migration 0003 per Supabase-Tool live einspielen, dann `main` aktualisieren.
