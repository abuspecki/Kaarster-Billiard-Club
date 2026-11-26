# Sport-App-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle Seiten im Sport-App-Stil (Vorbild ESPN) neu gestalten, hell/dunkel automatisch, plus Reiter, Ergebnisleiste, Form-Spalte und Gruppen-Ort.

**Architecture:** Gestaltungsgrundlage als CSS-Variablen in `app/globals.css` (hell + `prefers-color-scheme: dark`), über Tailwind-4-`@theme` als Farben nutzbar. Wiederverwendbare Bausteine in `components/sport/`. Reine Hilfsfunktionen (Form, Abzeichenfarbe, Initialen) mit Vitest getestet. Funktionen/Server Actions bleiben unverändert.

**Tech Stack:** Next.js 15, Tailwind CSS 4, `@fontsource/barlow-condensed`, `@fontsource-variable/inter`, Vitest, Playwright (nur Screenshots).

**Spec:** `docs/superpowers/specs/2026-11-26-sport-design-design.md`

## Global Constraints

- Akzentfarbe genau `#d50a0a`; einzige Akzentfarbe.
- Überschriften/Zahlen: Barlow Condensed 700/800; Fließtext: Inter.
- Hell und dunkel automatisch per `prefers-color-scheme`; Kopfleiste in beiden Modi dunkel.
- Text-Kontrast ≥ 4,5:1 in beiden Modi.
- Kein Billard-Kitsch (Filz/Holz/Kreide), keine Insider-Sprüche, keine neuen UI-Baukästen.
- Eintragen bleibt: Gegner antippen → Gewinner antippen (keine zusätzlichen Tipps).
- Oberfläche Deutsch; mobile first (390 px), nichts horizontal scrollend außer Ergebnisleiste und Turnierbaum.
- Server Actions, RPCs und Statistik-Logik bleiben funktional unverändert.

## Review Focus

1. **Lange Namen** („Maximilian-Alexander“) in Ergebnisleiste, Tabelle, Abzeichen → abgeschnitten mit „…“, kein Umbruch der Zeilen. Prüfung: Vorschau-Seite enthält einen 24-Zeichen-Namen; Screenshot-Check in Task 10.
2. **Gruppe ohne Partien / ohne Sitzung** → Übersicht zeigt freundliche Leerzustände statt leerer Karten. Vorschau enthält Leerzustand; Screenshot in Task 10.
3. **Gruppenname mit einem Wort oder Emojis** → Initialen sinnvoll (max. 3 Zeichen, nie leer). Test in Task 1 `groupInitials`.
4. **Spieler mit < 5 Partien** → Form zeigt nur vorhandene Ergebnisse, keine Platzhalter-Fehler. Test in Task 2.
5. **Dunkelmodus** → kein weißer Blitz, keine hart codierten hellen Farben (`bg-white`, `text-stone-*`) mehr in Komponenten. Prüfung in Task 10: `grep` findet keine `bg-white|stone-` in `app/` und `components/`.

---

## Gemeinsame Bausteine (`components/sport/`, in Task 1 und 4 angelegt)

| Datei | Export | Props |
|---|---|---|
| `AppBar.tsx` | `AppBar` | `{ title: string; subtitle?: string; initials?: string; back?: { href: string; label: string }; right?: ReactNode; children?: ReactNode /* Reiter */ }` |
| `PlayerBadge.tsx` | `PlayerBadge` | `{ player: PlayerKey; name: string; size?: 'sm' \| 'md' \| 'lg' }` |
| `FormDots.tsx` | `FormDots` | `{ form: ('W' \| 'L')[] }` |
| `ResultStrip.tsx` | `ResultStrip` | `{ items: StripItem[] }` mit `StripItem = { id: string; winner: string; loser: string; time: string; live: boolean }` |
| `ResultCard.tsx` | `ResultCard` | `{ winner: string; loser: string; meta: string; tag?: string; onClick?: () => void }` |
| `LiveCard.tsx` | `LiveCard` | `{ href: string; title: string; meta: string }` |
| `StatTiles.tsx` | `StatTiles` | `{ items: { value: string \| number; label: string }[] }` |
| `Tabs.tsx` | `Tabs` | `{ tabs: { key: string; label: string; href: string }[]; active: string }` |
| `LeagueTable.tsx` | `LeagueTable` | `{ standings: Standing[]; names: Record<PlayerKey,string>; forms?: Record<PlayerKey,('W'\|'L')[]>; profileHref?: (p: PlayerKey) => string \| null; limit?: number }` |
| `SectionCard.tsx` | `SectionCard` | `{ title?: string; action?: ReactNode; children: ReactNode; className?: string }` |
| `EmptyState.tsx` | `EmptyState` | `{ title: string; text?: string; action?: ReactNode }` |

`components/ui.tsx` behält `Button`, `Input`, `Card`, `ErrorText` (gleiche Props), nur neu gestaltet.

---

### Task 1: Gestaltungsgrundlage, Schriften, Hilfsfunktionen

**Files:** Modify `app/globals.css`, `app/layout.tsx`, `components/ui.tsx`, `components/Header.tsx` (entfernen → AppBar übernimmt), `package.json`. Create `lib/design.ts`, `components/sport/AppBar.tsx`, `components/sport/PlayerBadge.tsx`, `components/sport/SectionCard.tsx`, `components/sport/EmptyState.tsx`. Test `tests/design.test.ts`.

**Interfaces — Produces:**
- `AVATAR_PALETTE: readonly string[]` (8 Hex-Farben, weißer Text darauf ≥ 4,5:1)
- `avatarColor(player: PlayerKey): string` — Gäste (`g:`) → `'#6b7280'`; sonst Palette[hash % 8], Hash = Summe der Zeichencodes × 31 rollierend, deterministisch.
- `initialOf(name: string): string` — erster Buchstabe/Ziffer groß, sonst `'?'`.
- `groupInitials(name: string): string` — Anfangsbuchstaben der Wörter (nur Buchstaben/Ziffern), max. 3, groß; ein Wort → erste 3 Buchstaben; nichts verwertbar → `'?'`.
- CSS-Variablen: `--bg --surface --surface-2 --line --fg --muted --accent(#d50a0a) --win --loss --bar --bar-fg`; in Tailwind als `bg-bg`, `bg-surface`, `text-muted`, `border-line`, `text-accent` usw.; Utility `.font-cond` (Barlow Condensed).

- [ ] **Step 1: Failing tests** `tests/design.test.ts`:
  - `avatarColor('u:abc') === avatarColor('u:abc')` und ∈ `AVATAR_PALETTE`; `avatarColor('g:x') === '#6b7280'`
  - `groupInitials('Kaarster Billiard Club') === 'KBC'`, `groupInitials('Billardfreunde') === 'BIL'`, `groupInitials('🎱 Die Kugeln') === 'DK'`, `groupInitials('🎱') === '?'`, `groupInitials('a b c d') === 'ABC'`
  - `initialOf('max') === 'M'`, `initialOf('') === '?'`
  - jede Palettenfarbe hat Kontrast zu `#ffffff` ≥ 4.5 (Kontrastformel im Test als Hilfsfunktion)
- [ ] **Step 2:** `npm test` → FAIL (Modul fehlt).
- [ ] **Step 3:** `lib/design.ts` implementieren; `npm i @fontsource/barlow-condensed @fontsource-variable/inter`; Schriften in `layout.tsx` importieren; CSS-Variablen + `@theme` in `globals.css`; `ui.tsx` auf Variablen umstellen; `AppBar`, `PlayerBadge`, `SectionCard`, `EmptyState` anlegen; `Header` aus dem Layout entfernen (Abmelden wandert in AppBar `right` auf der Startseite).
- [ ] **Step 4:** `npm test` → PASS; `npm run build` → ok.
- [ ] **Step 5:** Commit `feat(design): theme tokens, fonts, badges`.

### Task 2: Form der letzten Partien

**Files:** Modify `lib/stats.ts`. Test `tests/stats.test.ts`.

**Interfaces — Produces:** `recentForm(matches: MatchRecord[], player: PlayerKey, n?: number /* 5 */): ('W' | 'L')[]` — Partien des Spielers nach Zeit sortiert, letzte `n`, älteste zuerst.

- [ ] **Step 1: Failing tests:** Ergebnisfolge (zeitlich) W,W,L,W,L,W → `['W','L','W','L','W']`; Spieler mit 2 Partien → Länge 2; unbekannter Spieler → `[]`; unsortierte Eingabe gibt dasselbe Ergebnis.
- [ ] **Step 2:** FAIL. **Step 3:** implementieren. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(stats): recent form`.

### Task 3: Ort der Gruppe

**Files:** Create `supabase/migrations/0002_group_location.sql`; Modify `supabase/tests/10_rpc.sql`, `lib/data.ts` (`loadGroup` liefert `location: string | null`), `app/actions/groups.ts` (neu `updateGroupLocation`), `app/g/[groupId]/settings/page.tsx`.

**Interfaces — Produces:** Spalte `groups.location text null check (location is null or char_length(trim(location)) between 1 and 60)`; `grant update (location) on public.groups to authenticated`. Action `updateGroupLocation(groupId: string, _: FormState, form: FormData): Promise<FormState>` (leer → `null`).

- [ ] **Step 1: Failing SQL test** (nach „admin renames group“): Admin setzt `location = 'Spielhalle Kaarst'` → gespeichert; Mitglied B setzt Ort → unverändert; Ort mit 61 Zeichen → Fehler (check).
- [ ] **Step 2:** `npm run test:db` → FAIL. **Step 3:** Migration + Code. **Step 4:** PASS; `npm run build` ok.
- [ ] **Step 5:** Commit `feat: group location`. (Live-Datenbank: Migration nach Abschluss aller Tasks per Supabase-Tool einspielen – Task 10.)

### Task 4: Sport-Bausteine

**Files:** Create `components/sport/{FormDots,ResultStrip,ResultCard,LiveCard,StatTiles,Tabs,LeagueTable}.tsx`; delete `components/RankingTable.tsx` (Aufrufer in Task 5/8 umgestellt). Test: Build + Vorschau (Task 10).

**Interfaces:** siehe Tabelle „Gemeinsame Bausteine“. `LeagueTable` Spalten `# · Spieler · S · N · % · Form`; Platz 1 Zeile mit Akzent-Hintergrund (`--accent` 8 % Deckkraft); Namen `truncate`. `ResultStrip` horizontal scrollbar, Karten 128 px, LIVE-Karten mit rotem Punkt und rotem „LIVE“, sonst „ENDSTAND · hh:mm“.

- [ ] **Step 1:** Bausteine anlegen. **Step 2:** `npm run build` + `npm run lint` → ok. **Step 3:** Commit `feat(design): sport components`.

### Task 5: Startseite und Gruppenseite mit Reitern

**Files:** Modify `app/page.tsx`, `app/g/[groupId]/page.tsx`; Create `lib/group-view.ts`. Test `tests/group-view.test.ts`.

**Interfaces — Produces (rein, in `lib/group-view.ts`):**
- `type GroupTab = 'uebersicht' | 'tabelle' | 'turniere' | 'spieler'`; `parseTab(v: unknown): GroupTab` (Unbekanntes → `'uebersicht'`).
- `stripItems(matches: MatchRecord[], names: Record<PlayerKey,string>, liveSessionMatchIds: Set<string>, limit = 10): StripItem[]` — neueste zuerst; Namen mehrerer Spieler mit „ + “; Zeit `hh:mm` Europe/Berlin.
- `lastEvening(sessions: { id: string; created_at: string }[], matchesBySession: Map<string, MatchRecord[]>): { sessionId: string; matches: MatchRecord[] } | null` — jüngste Sitzung mit ≥ 1 Partie.

Gruppenseite: `AppBar` (Initialen, Name, Ort, Einstellungen-Link für Admin) + `Tabs` (`?tab=`). Übersicht: `ResultStrip`, `LiveCard` je laufende Sitzung, „Sitzung starten“, `LeagueTable limit=5` mit Link „Alle ›“ auf `?tab=tabelle`, „Letzter Abend“-`StatTiles`. Tabelle: volle `LeagueTable` mit Form. Turniere: Liste der Sitzungen mit beendetem Turnier (Datum, Turniersieger) → `/s/{id}/tournament`. Spieler: Liste mit `PlayerBadge` → Profil. Einladung: Karte unten in Übersicht. Startseite: AppBar „Billiard-Tracker“ + Abmelden; Gruppen als Karten mit Initialen-Logo; Code-Feld; Neue Gruppe.

- [ ] **Step 1: Failing tests:** `parseTab('tabelle') === 'tabelle'`, `parseTab('x') === 'uebersicht'`; `stripItems` liefert neueste zuerst, `live` true nur für IDs im Set, Doppel-Namen „Max + Lea“, Zeit `'21:14'` für `2026-11-26T20:14:00Z`, max. `limit`; `lastEvening` überspringt leere jüngere Sitzung.
- [ ] **Step 2:** FAIL. **Step 3:** implementieren + Seiten. **Step 4:** `npm test` PASS, build ok.
- [ ] **Step 5:** Commit `feat(design): group page with tabs`.

### Task 6: Live-Sitzung und Eintragen

**Files:** Modify `components/SessionLive.tsx`, `components/MatchEntry.tsx`, `app/s/[sessionId]/page.tsx`; Create `components/sport/Toast.tsx`.

**Interfaces:** `Toast` `{ message: string | null }` – blendet 1,8 s ein. `MatchEntry` bekommt Prop `onSaved?: (message: string) => void`; SessionLive zeigt „Gespeichert ✓“ (neu) bzw. „Geändert ✓“ / „Gelöscht“.

Sitzung: AppBar mit LIVE-Abzeichen (aktiv) oder „BEENDET“, Code-Teilen rechts; großer „+ Partie eintragen“; Partien als `ResultCard` („Max 1 : 0 Lea“, Meta „21:14 · eingetragen von Lea“, Tag „Turnier“ bei Turnierpartien); Spielerleiste mit `PlayerBadge`. Eintragen als Bottom-Sheet im neuen Look, Spieler-Chips mit Abzeichen; Ablauf und Tippzahl unverändert.

- [ ] **Step 1:** umsetzen. **Step 2:** `npm test` (match-entry Tests grün), build ok. **Step 3:** Commit `feat(design): live session`.

### Task 7: Turnier

**Files:** Modify `components/BracketView.tsx`, `components/TeamDraw.tsx`, `components/TournamentLive.tsx`.

Bracket: Runden-Überschriften in `font-cond` uppercase, Match-Karten `surface` mit Trennlinie, Sieger fett + ✓ + Akzentstrich links, Verlierer `muted` durchgestrichen nicht, nur grau; Freilos kursiv. Champion-Banner als große Karte mit Pokal. TeamDraw im neuen Look mit Abzeichen.

- [ ] **Step 1:** umsetzen. **Step 2:** build ok, Tests grün. **Step 3:** Commit `feat(design): tournament`.

### Task 8: Spielerprofil und Spielbericht

**Files:** Modify `app/g/[groupId]/p/[userId]/page.tsx`, `app/s/[sessionId]/summary/page.tsx`.

Profil: Kopf mit großem `PlayerBadge` (lg) + Name, `StatTiles` (Siege, Niederlagen, %, Partien), `FormDots` der letzten 10 (`recentForm(..., 10)`), Einzel/Team, Direktvergleiche als Zeilen mit Abzeichen und „12 : 8“. Spielbericht: Kopf „SPIELBERICHT“ + Datum + Gruppe, großer „Spieler des Abends“-Block mit Abzeichen, `StatTiles` (Partien, längste Serie, Turniersieger falls vorhanden), Ergebnistabelle (`LeagueTable` inkl. Gäste), Teilen-Knopf.

- [ ] **Step 1:** umsetzen. **Step 2:** build ok. **Step 3:** Commit `feat(design): profile and match report`.

### Task 9: Restliche Seiten

**Files:** Modify `components/AuthForm.tsx`, `app/join/[code]/page.tsx`, `app/g/[groupId]/settings/page.tsx`, `app/error.tsx`, `app/not-found.tsx`, `components/FormCard.tsx`, `components/ActionButton.tsx`, `components/ShareButton.tsx`.

Auth: dunkle Markenfläche oben (Initialen-Logo „BT“, „Billiard-Tracker“ in `font-cond`), Formular als Karte. Alle Seiten nutzen nur Variablen-Farben.

- [ ] **Step 1:** umsetzen. **Step 2:** `grep -rnE "bg-white|stone-|emerald-|sky-|amber-" app components` → keine Treffer. **Step 3:** build/lint ok. **Step 4:** Commit `feat(design): remaining pages`.

### Task 10: Vorschau, Screenshots, Live-Migration

**Files:** Create `app/dev/preview/page.tsx` (nur wenn `process.env.NODE_ENV !== 'production'`, sonst `notFound()`), `scripts/screenshots.mjs`; Modify `middleware.ts` (Pfad `/dev/preview` ohne Login nur außerhalb Produktion), `README.md` (Hinweis Ort-Feld).

Vorschau rendert mit Beispieldaten: AppBar+Tabs, ResultStrip (inkl. LIVE und 24-Zeichen-Name), LiveCard, LeagueTable mit Form, StatTiles, EmptyState, ResultCards, Bracket (5 Teams, teilweise entschieden), Profil-Kopf, Spielbericht-Kopf.

- [ ] **Step 1:** Vorschau + Skript (Playwright: `npm run dev` auf Port 3123, Screenshots 390×1600 `colorScheme: 'light'` und `'dark'`).
- [ ] **Step 2:** Screenshots ansehen; Mängel (Kontrast, Überlauf, Leerzustand) beheben.
- [ ] **Step 3:** `npm test`, `npm run test:db`, `npm run lint`, `npm run build` → alle grün; `next build` darf `/dev/preview` enthalten, gibt in Produktion aber 404.
- [ ] **Step 4:** Migration `0002_group_location.sql` per Supabase-Tool in Projekt `gezrmoozsgcvrhlumapt` einspielen.
- [ ] **Step 5:** Commit `feat(design): preview page and screenshots`.
