# Spieler pausieren – Kurzdesign

Stand: 2026-11-27 · vom Nutzer freigegeben („ja“)

**Warum:** Am Abend macht jemand Pause oder ist gegangen; er soll nicht mehr als Mitspieler angeboten werden, aber jederzeit zurückkommen können.

**Ziele**
- In der Sitzung: Spieler antippen → „Pause“ / „Zurück“. Pausierte tragen ein graues ⏸-Abzeichen.
- Eintragen: pausierte Spieler ausgegraut am Ende der Liste, weiterhin antippbar.
- Turnier-Auslosung: pausierte Spieler standardmäßig nicht ausgewählt.
- Jeder Sitzungsteilnehmer mit Konto darf umschalten (gleiche Regel wie Eintragen), nur in laufender Sitzung.
- Gilt nur für diese Sitzung; live auf allen Handys.
- Teil 2 (Spielreihenfolge) überspringt pausierte Spieler.

**Nicht-Ziele:** Keine Auswirkung auf Statistik oder Rangliste; keine Pause auf Gruppenebene.

**Ansätze:** Nur ein sinnvoller Weg – Spalte `session_players.paused` + RPC `set_player_paused` mit derselben Rechteprüfung wie `record_match`. (Alternative „Spieler aus der Sitzung entfernen“ verworfen: zerstört Verknüpfung zu gespielten Partien.)

**Claudes Entscheidungen:** Umschalten über ein kleines Menü beim Antippen eines Spielers in der Spielerliste; Änderung wird per Realtime (`session_players` ist schon abonniert) verteilt.
