# Billiard-Tracker – Design

Stand: 2026-11-26 · Status: wartet auf Freigabe

## 1. Absicht und Warum

Eine Website, mit der Freundeskreise ihre Billiard-Partien festhalten. Ursprünglich für den
„Kaarster Billiard Club“ (der Nutzer und seine Freunde), aber so gebaut, dass auch andere
Gruppen sie nutzen können.

Typischer Ablauf: Ein paar Leute gehen spielen, auch mal nur zu dritt. Einer startet eine
**Sitzung**, die anderen steigen per Code oder Link vom eigenen Handy ein. Alle tragen
Ergebnisse ein und sehen sofort denselben Stand. Über alle Sitzungen hinweg entstehen
Statistiken und eine **Rangliste nach den meisten Siegen**. Bei Bedarf wird aus einer
Sitzung ein **Turnier** mit Teams und einem **Turnierbaum**.

Leitlinie des Nutzers: **übersichtlich und einfach zu benutzen.** Jede Funktion muss sich
daran messen lassen.

## 2. Ziele

- Gruppen anlegen, jede mit eigener Rangliste und eigenen Statistiken (eine Person kann in
  mehreren Gruppen sein).
- Sitzungen innerhalb einer Gruppe starten, Beitritt per Code/Link.
- Gäste ohne Konto per Namen in eine Sitzung aufnehmen.
- Partie-Ergebnis mit ca. 2 Tipps eintragen (Gegner wählen → Gewinner antippen).
- Live-Aktualisierung: alle Geräte in einer Sitzung sehen Änderungen ohne Neuladen.
- Turnier in einer Sitzung: Teams bilden (zufällig auslosen mit „neu mischen“ oder von Hand),
  K.o.-Turnierbaum, der sich mit Ergebnissen automatisch füllt.
- Spielerstatistiken: Siege, Niederlagen, Siegquote, gespielte Partien.
- Direkter Vergleich zweier Spieler („Du gegen Max: 12 : 8“).
- Abend-Zusammenfassung am Ende einer Sitzung (Spieler des Abends, längste Siegesserie),
  teilbar (z. B. in WhatsApp).
- Handy zuerst, funktioniert auch am Computer. Oberfläche auf Deutsch.

## 3. Nicht-Ziele (vorerst)

- Spielart (8-Ball, 9-Ball …) mit getrennten Statistiken – später.
- Siegesserien als Abzeichen/Achievements – später.
- Elo-artige „faire“ Wertung – später.
- Globale Rangliste über alle Gruppen – später, optional.
- Gäste nachträglich mit einem Konto verknüpfen – später.

## 4. Anti-Ziele (wäre ein Fehlschlag, selbst wenn es technisch funktioniert)

- Ergebnis eintragen dauert länger als ein paar Sekunden oder braucht Formulare.
- Punktestände innerhalb einer Partie, Fouls, Chat – bewusst weggelassen, machen es unübersichtlich.
- Unterschiedlicher Stand auf verschiedenen Handys.
- Eine Gruppe sieht oder verändert Daten einer anderen Gruppe.

## 5. Ansätze

| | Ansatz | Abwägung |
|---|---|---|
| **A (gewählt)** | Next.js-Website bei Vercel + Supabase (Postgres, Login, Realtime) | Login und Live-Updates fertig; relationale DB macht Rangliste/Direktvergleich einfach und zuverlässig; für diese Größe kostenlos. Nutzer muss einmal zwei Konten anlegen. |
| B | Google Firebase | Ebenso bequem, aber Dokument-Datenbank macht Auswertungen über viele Sitzungen umständlich. |
| C | Eigener Server | Volle Kontrolle, aber Betrieb/Sicherheit/Updates und selbstgebaute Live-Updates – zu viel Pflege für ein Freundesprojekt. |

Der Nutzer hat die Technik an Claude übergeben („Sag du“); A ist Claudes Wahl.

## 6. Festgelegtes

### Konten und Gruppen
- Konto mit E-Mail + Passwort und frei wählbarem Anzeigenamen (Supabase Auth).
  *(Claudes Entscheidung: Magic-Links sind bei Supabase im Gratis-Tarif stark mengenbegrenzt.)*
- Wer eine Gruppe anlegt, ist deren Admin. Einladung per Link/Code.
- Admin kann Gruppe umbenennen, Mitglieder entfernen, Einladungscode erneuern.

### Sitzungen
- Gehören immer zu einer Gruppe. Jedes Gruppenmitglied kann eine Sitzung starten.
- Beitritt über kurzen Code (z. B. 6 Zeichen) oder Link. Wer mit Konto beitritt und noch nicht
  in der Gruppe ist, wird automatisch Gruppenmitglied. *(Claudes Entscheidung: einfachster Weg;
  Fremde kommen nur mit dem Code hinein.)*
- Teilnehmer: Konten und Gäste (nur Name). Gästepartien zählen in der Sitzung und deren
  Zusammenfassung, aber **nicht** in Gruppen-Rangliste/Statistiken.
- Sitzung kann beendet werden (Ersteller oder Gruppen-Admin) → Abend-Zusammenfassung.
  Beendete Sitzungen bleiben einsehbar.

### Partien
- Einzel (1 gegen 1) oder Doppel (2 gegen 2) – auch außerhalb von Turnieren. *(Nutzer: ja)*
- Eintragen: Einzel ist Standard (Gegner auswählen → Gewinner antippen). Ein Umschalter
  „Doppel“ fügt je einen Partner hinzu – höchstens ein Tipp mehr pro Seite.
- Gespeichert wird, wer eingetragen hat und wann.
- Jeder Sitzungsteilnehmer mit Konto kann eine Partie der laufenden Sitzung korrigieren oder
  löschen (unter Freunden einfacher als Rechteverwaltung; „eingetragen von“ bleibt sichtbar).

### Turniere
- Format: K.o.-System (einfaches Ausscheiden). Bei einer Teilnehmerzahl, die keine
  Zweierpotenz ist, erhalten die gesetzten Ersten ein Freilos in Runde 1.
- Teams: Teamgröße wählbar (1 = jeder für sich, 2, 3 …). Auslosen per Zufall mit
  „neu mischen“, oder von Hand zuordnen. Teams sind fest, sobald das Turnier startet.
- Ergebnis im Turnierbaum: Sieger antippen → rückt automatisch in die nächste Runde.
  Korrektur möglich, solange die Folgepartie noch nicht gespielt ist.
- Ein Turnier pro Sitzung zur gleichen Zeit; normale Partien sind daneben weiter möglich.

### Statistik und Rangliste (pro Gruppe)
- **Team-/Doppelsiege zählen für jedes Teammitglied als Sieg** (ebenso Niederlagen), auch
  im Turnier. *(Nutzer: ja)* Im Spielerprofil werden Einzel und Team getrennt ausgewiesen;
  die Rangliste nutzt die Summe.
- Direktvergleich bezieht sich auf Partien, in denen beide auf **gegnerischen** Seiten standen.
- Rangliste sortiert nach Siegen; Gleichstand → höhere Siegquote → weniger Partien.
- Spielerprofil in der Gruppe: Siege, Niederlagen, Siegquote, Partien, Direktvergleich mit
  jedem anderen Mitglied.
- Abend-Zusammenfassung: Siege je Spieler des Abends, Spieler des Abends (meiste Siege,
  bei Gleichstand bessere Quote), längste Siegesserie, ggf. Turniersieger. Teilen über die
  Web-Share-Funktion des Handys bzw. Text kopieren.

### Technik (Claudes Entscheidungen)
- Next.js (App Router) + TypeScript + Tailwind CSS, Hosting bei Vercel.
- Supabase: Postgres mit Row Level Security (Zugriff nur für Gruppenmitglieder),
  Auth, Realtime für Sitzungen und Turnierbäume.
- Statistiken werden aus den Partien berechnet (DB-Views/Abfragen), nicht separat gespeichert –
  so bleiben sie nach Korrekturen automatisch richtig.
- Automatische Tests für die heiklen Logikteile: Turnierbaum (inkl. Freilose), Rangliste,
  Siegesserien, Direktvergleich.

## 7. Seiten (Skizze)

```
Start (eingeloggt)        Gruppe                     Sitzung (live)
┌──────────────────┐     ┌──────────────────────┐   ┌──────────────────────┐
│ Meine Gruppen    │     │ Kaarster Billiard Cl.│   │ Sitzung · Code K7P2QX│
│ › Kaarster B. C. │ ──▶ │ [▶ Sitzung starten]  │   │ [+ Partie]           │
│ [+ Gruppe]       │     │ Rangliste            │   │ Max  schlägt  Tim    │
│ [Code eingeben]  │     │ 1. Max   24 Siege    │   │ Lea  schlägt  Max    │
└──────────────────┘     │ 2. Lea   19 Siege    │   │ [🏆 Turnier starten] │
                         │ Letzte Sitzungen …   │   │ [Sitzung beenden]    │
                         └──────────────────────┘   └──────────────────────┘
```

Weitere Seiten: Spielerprofil (Statistik + Direktvergleich), Turnier (Teams auslosen →
Turnierbaum), Abend-Zusammenfassung, Login/Registrieren, Gruppeneinstellungen.

## 8. Dem Builder überlassen

- Genaues Datenbankschema, Komponentenaufteilung, visuelles Design im Detail.
- Darstellung des Turnierbaums auf kleinen Bildschirmen (z. B. horizontal scrollbar).
- Form der Codes, Wortwahl der Oberfläche.
- Anleitung für den Nutzer zum Einrichten von Supabase und Vercel (README, Schritt für Schritt).
