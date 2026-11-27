# Doppel-K.o., Spielreihenfolge und Push – Design

Stand: 2026-11-27 · Status: wartet auf Freigabe
Teil 2 und 3 der Reihe (Teil 1 = Sport-Design, erledigt)

## Absicht und Warum

Die Gruppe spielt an **einem Tisch**, meist **1 gegen 1**. Ein Abend läuft wie ein Turnier mit Verliererrunde: „erst spielen alle eine Runde, dann Loser-Bracket, dann die Finalspiele“. Sobald ein Ergebnis eingetragen ist, ist der Tisch frei – die App soll dann wissen und anzeigen, **wer als Nächstes dran ist**, und diesen Spielern eine **Push-Benachrichtigung** schicken.

## Ziele

1. **Turnierart wählbar** beim „Turnier starten“: *K.o.* (wie bisher) oder *Doppel-K.o.*.
2. **Doppel-K.o.**: Gewinnerrunde (Winners), Verliererrunde (Losers), wer zweimal verliert, ist raus. **Finale: ein einziges Spiel** zwischen Sieger der Gewinnerrunde und Sieger der Verliererrunde (Nutzer: „Einziges Spiel“). Ungerade Teilnehmerzahl → Freilose für die Bestgesetzten (wie heute).
3. **Spielreihenfolge** (beide Turnierarten): Die App bestimmt aus dem Baum die Partie, die **jetzt dran** ist, und die **danach**. Anzeige groß oben auf Turnier- und Sitzungsseite („Jetzt am Tisch: Max – Lea · Danach: Tim – Jonas“).
4. **Pausierte Spieler**: Partien mit einem pausierten Spieler werden übersprungen (bleiben offen, „wartet – Pause“); die nächste spielbare rückt nach.
5. **Push „Du bist dran“**: Spieler mit Konto, die Benachrichtigungen eingeschaltet haben, bekommen eine Nachricht, wenn ihre Partie *jetzt dran* ist; zusätzlich „Du bist gleich dran“, wenn ihre Partie *danach* kommt. Auslöser: Turnierstart und jedes eingetragene Turnierergebnis. Jede Nachricht pro Partie und Art höchstens einmal.
6. **Einschalten**: Knopf „🔔 Benachrichtigungen einschalten“ (Sitzungs- und Turnierseite, einmal pro Handy). Auf dem iPhone mit Hinweis, dass es nur aus der App auf dem Home-Bildschirm geht.

## Nicht-Ziele

- Keine Reihenfolge für freie Partien außerhalb eines Turniers.
- Kein manuelles Umsortieren der Reihenfolge.
- Keine Push-Nachrichten für andere Ereignisse (neue Sitzung, Ergebnis anderer).
- Kein zweites Finalspiel („Bracket Reset“).

## Anti-Ziele

- Doppelte oder falsche Benachrichtigungen (falscher Spieler, alte Partie).
- Eintragen wird langsamer, weil auf den Push-Versand gewartet wird.
- Bestehende K.o.-Turniere gehen kaputt.

## Ansätze

| Teil | Gewählt (Nutzer: „A“) | Verworfen |
|---|---|---|
| Reihenfolge | **Aus dem Baum abgeleitet**, nichts extra gespeichert; Korrekturen passen sie automatisch an | Gespeicherte, umsortierbare Warteschlange – mehr Aufwand, nicht gewünscht |
| Push | **Web-Push direkt aus der Website** (Service Worker + Tabelle der Abos, Versand vom Server mit VAPID-Schlüssel) | Fremder Dienst (OneSignal o. ä.) – zusätzliches Konto, Daten bei Dritten |

## Festgelegt (Claudes Entscheidungen)

### Turnierbaum als Graph
- Jede Partie kennt ihre **Quellen**: Setzplatz oder „Sieger/Verlierer von Partie X“. Daraus funktionieren einfaches und doppeltes K.o. mit derselben Logik (Bereit-Prüfung, Freilose, Weiterreichen, Korrektur-Sperre).
- Partie-IDs: Gewinnerrunde `W{r}-{s}`, Verliererrunde `L{r}-{s}`, Finale `F`. Bestehende gespeicherte K.o.-Bäume (`r{r}-s{s}`) werden beim Laden weiter verstanden (Quellen aus Runde/Slot abgeleitet) – keine Datenmigration.
- Verliererrunde nach Standardschema: L-Runde 1 = Verlierer der W-Runde 1 gegeneinander; danach abwechselnd „Verlierer der nächsten W-Runde rein“ und „L-intern“. Freilose (fehlende Verlierer) werden automatisch durchgereicht.
- Korrektur eines Ergebnisses nur, solange **keine** Folgepartie (Sieger- **und** Verlierer-Weg) entschieden ist.

### Reihenfolge
- Kandidaten: Partien mit beiden Teams, ohne Sieger, kein Freilos, kein pausierter Spieler.
- Sortierung: **Welle** (frühester Zeitpunkt, zu dem die Partie spielbar sein kann = Länge des längsten Vorgängerpfads) aufsteigend; bei gleicher Welle **Verliererrunde vor Gewinnerrunde** (entspricht „erst eine Runde, dann Loser-Bracket“); dann Slot. Finale immer zuletzt.
- „Jetzt dran“ = erste Kandidatin, „Danach“ = zweite.

### Push
- Neue Tabelle `push_subscriptions` (Nutzer, Endpoint, Schlüssel, Gerätename optional), nur eigene Zeilen lesbar/löschbar.
- Versand ohne Admin-Schlüssel: Datenbank-Funktion `claim_push_targets(tournament, partie, art)` prüft, dass der Aufrufer Sitzungsteilnehmer ist, merkt sich „schon benachrichtigt“ (eindeutig je Turnier+Partie+Art) und gibt nur beim ersten Mal die Abos der betroffenen Spieler zurück.
- Versand **nach** dem Speichern, ohne das Eintragen aufzuhalten (Fehler beim Versand werden ignoriert; abgelaufene Abos – HTTP 404/410 – werden entfernt).
- VAPID-Schlüssel: einmal erzeugt; öffentlicher Teil als `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, privater als geheimer Vercel-Wert `VAPID_PRIVATE_KEY`, Kontakt `VAPID_SUBJECT`.
- Texte: „🎱 Du bist dran! Max gegen Lea – ab an den Tisch.“ / „⏳ Du bist gleich dran: Tim gegen Jonas als Nächstes.“ Antippen öffnet das Turnier.
- Bibliothek `web-push` auf dem Server; Service Worker `public/sw.js` zeigt Nachricht und öffnet die Seite.

## Prüfung
- Reine Logik (Baum-Erzeugung für 2–16 Teams beider Arten, Freilose, Weiterreichen, Korrektur-Sperre, Reihenfolge inkl. Pause) mit Vitest.
- SQL-Tests für `push_subscriptions`-Rechte und `claim_push_targets` (nur einmal, nur Teilnehmer).
- Bestehende K.o.-Tests bleiben grün (alte Bäume weiter lesbar).
- Echtes Zustellen am Handy kann ich nicht testen → Nutzer testet nach dem Live-Gang mit 2 Handys.

## Dem Builder überlassen
Darstellung der Verliererrunde im Baum (eigener Abschnitt unter der Gewinnerrunde), genaue Texte/Icons, Aufbau des Service Workers.
