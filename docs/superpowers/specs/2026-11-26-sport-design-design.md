# Neues Design im Sport-App-Stil – Design

Stand: 2026-11-26 · Status: wartet auf Freigabe
Teil 1 von 3 (danach: Doppel-K.o. mit Spielreihenfolge, dann Push-Benachrichtigungen)

## Absicht und Warum

Die Seite wirkt heute zu schlicht, „wie eine Fake-Seite“. Sie soll sich anfühlen wie eine echte, liebevoll gemachte Sport-App. Vorbild des Nutzers: **ESPN-App**. Abgelehnt wurden: Billardtisch-Look (Filz/Holz/Messing), Neon-Spielhalle, Kreidetafel und eingebaute Insider-Sprüche („Onkel“, „Diamond Rule“).

Bestätigte Richtung (Mockup `design-sport.html`): Ergebnisleiste, LIVE-Abzeichen, Ligatabelle mit Form-Spalte, große Statistik-Zahlen, Reiter.

## Ziele

- Einheitlicher Sport-App-Look auf **allen** Seiten: kräftige schmale Überschriftenschrift (Barlow Condensed), Fließtext Inter, große Zahlen, Rot (`#d50a0a`) als einzige Akzentfarbe, klare Karten.
- **Hell und dunkel automatisch** nach Handy-Einstellung (`prefers-color-scheme`); beide gleich sorgfältig.
- **Spieler-Abzeichen**: farbiger Kreis mit Anfangsbuchstaben, Farbe fest pro Spieler (aus der ID abgeleitet, Palette mit 8 gut unterscheidbaren Farben). Gäste grau.
- **Kopfleiste** (in beiden Modi dunkel, wie im Mockup): Logo-Platzhalter mit Initialen der Gruppe (z. B. „KBC“), Gruppenname, darunter Ort.
- **Gruppenseite mit Reitern** Übersicht · Tabelle · Turniere · Spieler:
  - *Übersicht*: Ergebnisleiste (letzte Partien; Partien der laufenden Sitzung mit rotem Punkt), LIVE-Karte der laufenden Sitzung mit „Öffnen“, „Sitzung starten“, Top-5-Tabelle, „Letzter Abend“ mit großen Zahlen (Partien, bester Spieler, längste Serie).
  - *Tabelle*: vollständige Ligatabelle (#, Spieler, S, N, %, Form der letzten 5).
  - *Turniere*: vergangene Sitzungen mit Turnier, jeweils Turniersieger; Link zum Baum.
  - *Spieler*: Mitgliederliste mit Abzeichen → Profil.
- **Live-Sitzung**: LIVE-Abzeichen im Kopf, Partien als Ergebniskarten („Max 1 : 0 Lea · Endstand · 21:14“), großer „+ Partie eintragen“-Knopf.
- **Eintragen**: Ablauf unverändert (Gegner antippen → Gewinner antippen), neuer Look, kurze Bestätigung „Gespeichert ✓“ nach dem Speichern.
- **Turnierbaum**: Sport-Bracket-Optik (Runden als Spalten, Sieger fett mit Häkchen, Verlierer ausgegraut).
- **Spielerprofil**: große Zahlen oben (Siege, Niederlagen, %, Partien), Form-Leiste, Einzel/Team, Direktvergleiche.
- **Abend-Zusammenfassung**: als „Spielbericht“ gestaltet, screenshot-würdig für WhatsApp.
- **Login/Registrierung, Einstellungen, Fehlerseiten**: im selben Stil.

## Nicht-Ziele

- Keine Funktionsänderungen außer den hier genannten (Reiter, Ergebnisleiste, Form-Spalte, Ort, Bestätigung).
- Kein Doppel-K.o., keine Spielreihenfolge, keine Push-Benachrichtigungen (Teile 2 und 3).
- Kein echtes Logo-Design (Initialen-Platzhalter).

## Anti-Ziele

- Billard-Kitsch (Filz-, Holz-, Kreidetexturen), Insider-Sprüche.
- Eintragen wird langsamer oder braucht mehr Tipps.
- Schlecht lesbar in einem der beiden Modi (Kontrast mindestens WCAG AA).
- Aussehen nach Baukasten/Vorlage.

## Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A (gewählt)** | Eigene Gestaltungsgrundlage (Farben/Schriften/Abstände als CSS-Variablen für hell+dunkel) und alle Seiten damit neu gestalten | Keine neuen Abhängigkeiten außer Schriften, Funktionen und Tests bleiben, eigenständiger Look |
| B | Fertiger UI-Baukasten (z. B. shadcn/Radix) | Saubere Grundbausteine, aber viel Austausch, neue Abhängigkeiten, wirkt leicht nach Vorlage |

Nutzer: „Mach A.“

## Festgelegt (Claudes Entscheidungen, vom Nutzer nicht einzeln abgestimmt)

- Schriften über `@fontsource` (Barlow Condensed 700/800, Inter 400–800) mit der Seite ausgeliefert – kein Abruf bei Google.
- Farben als CSS-Variablen, Umschaltung per `prefers-color-scheme`; Tailwind nutzt die Variablen.
- **Neues Feld „Ort“ an der Gruppe** (optional, max. 60 Zeichen, vom Admin in den Einstellungen änderbar), damit „Spielhalle Kaarst“ unter dem Namen stehen kann. Kleine Datenbank-Änderung (neue Migration).
- Reiter der Gruppenseite über die Adresse (`?tab=tabelle`), damit Zurück-Taste und Teilen funktionieren.
- „Form“ = Ergebnisse der letzten 5 Partien eines Spielers, neueste rechts; neue reine Funktion mit Tests.
- Ergebnisleiste: bis zu 10 neueste Partien der Gruppe; LIVE-Punkt bei Partien einer laufenden Sitzung. (Die App kennt keine „gerade laufende“ Partie – das kommt erst mit Teil 2.)
- „Letzter Abend“ = jüngste Sitzung mit mindestens einer Partie.
- Abzeichenfarbe: einfacher Hash der Nutzer-ID → Palette; reine Funktion mit Test (gleiche ID → gleiche Farbe).

## Prüfung

- Bestehende Tests bleiben grün; neue Tests für Form, Abzeichenfarbe, Gruppen-Initialen.
- Screenshots aller Seiten bei 390 px Breite in hell **und** dunkel. Dafür eine Vorschau-Seite mit Beispieldaten, die nur in der Entwicklung erreichbar ist (nicht in der Live-Seite).
- Kontrast der Textfarben gegen Hintergrund in beiden Modi ≥ 4,5:1.

## Dem Builder überlassen

Genaue Abstände, Schatten, Rundungen, Animationen, Komponentenaufteilung, exakte Farbwerte der Palette (innerhalb der Kontrastvorgabe).
