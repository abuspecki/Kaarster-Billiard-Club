# Spieler in der Gruppe aussetzen – Kurzdesign

Stand: 2026-11-27 · vom Nutzer freigegeben („Ja“)

**Warum:** Ein Spieler ist (vorerst) nicht da; das soll direkt in der Gruppe einstellbar sein, ohne Sitzung oder Turnier.

- Gruppe → Reiter „Spieler“ → Spieler antippen → „⏸ Aussetzen“ / „▶ Zurück“; Abzeichen „Setzt aus“. Bleibt bis zum Zurückholen.
- Wirkung: Tritt er einer Sitzung bei (Code oder Start), ist er dort automatisch pausiert → beim Auslosen nicht vorausgewählt, im Turnier übersprungen. Tabelle unverändert.
- Jedes Gruppenmitglied darf umschalten.
- Umsetzung: Spalte `group_members.sitting_out`, RPC `set_member_sitting_out`; `join_by_code` und `start_session` übernehmen den Wert als `session_players.paused`.
