# App-Symbol, Rückgängig, vergessene Sitzungen – Kurzdesign

Stand: 2026-11-27 · vom Nutzer freigegeben („Ja“)

1. **App-Symbol/Startbildschirm:** Web-App-Manifest (Name „Billiard-Tracker“, Kurzname „Billiard“, `display: standalone`, Theme dunkel `#121214`), Icon rotes Quadrat `#d50a0a` mit „KBC“ (192/512 px + Apple-Touch-Icon 180 px), `appleWebApp.capable`. Voraussetzung für Push am iPhone.
2. **Rückgängig:** Nach dem Eintragen zeigt die Bestätigung ~6 s lang „Rückgängig“; löscht genau diese Partie (`delete_match`). Nicht für Turnierpartien (die werden ohnehin im Baum eingetragen).
3. **Vergessene Sitzungen:** Aktive Sitzung, deren letzte Aktivität (Start oder letzte Partie) > 12 h her ist, wird beendet (`ended_at` = letzte Aktivität). Geprüft beim Öffnen von Gruppe/Sitzung über RPC `end_stale_sessions(p_group_id)`, nur für Gruppenmitglieder. Kein Hintergrund-Job.

**Ansätze:** je ein sinnvoller Weg; für 3 wurde ein geplanter Datenbank-Job (pg_cron) verworfen – zusätzliche Infrastruktur, und „beim Öffnen“ reicht, weil nur dann jemand den Zustand sieht.
