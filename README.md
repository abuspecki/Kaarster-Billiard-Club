# 🎱 Billiard-Tracker

Eine Website für Billiard-Abende mit Freunden – gebaut für den Kaarster Billiard Club, nutzbar für jede Gruppe.

**Was sie kann**

- **Gruppen** mit eigener Rangliste. Einladen per Link oder 8-stelligem Code.
- **Sitzungen**: Einer startet, die anderen steigen per 6-stelligem Code ein. Alle Handys sehen jede Änderung sofort.
- **Partien eintragen** in 2–3 Tipps – Einzel oder Doppel. Gäste ohne Konto können mitspielen (zählen nicht in der Rangliste).
- **Turniere**: Teams auslosen (oder von Hand einteilen) → K.o.-Turnierbaum, der sich mit jedem Ergebnis füllt.
- **Rangliste** nach Siegen (Team- und Doppelsiege zählen für jedes Teammitglied), **Spielerprofil** mit direktem Vergleich.
- **Abend-Zusammenfassung** zum Teilen in WhatsApp.

---

## Online bringen (einmalig, ca. 15 Minuten, kostenlos)

Du brauchst zwei kostenlose Konten: **Supabase** (Datenbank + Login) und **Vercel** (stellt die Website online).

### 1. Supabase einrichten

1. Auf <https://supabase.com> registrieren und **New project** anlegen (Region z. B. *Frankfurt*). Datenbank-Passwort irgendwo notieren.
2. Links **SQL Editor** → **New query** öffnen, den kompletten Inhalt von [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) hineinkopieren und **Run** drücken. Es sollte „Success“ erscheinen.
3. Links **Authentication → Sign In / Providers → Email**:
   - *Confirm email* kannst du an- oder ausschalten. **Aus** ist für den Anfang bequemer: Freunde sind sofort drin, und der Gratis-Mailversand von Supabase (nur wenige Mails pro Stunde) wird nicht gebraucht. **An** funktioniert auch – der Link in der Mail meldet direkt an und führt zur Einladung zurück.
4. Links **Project Settings → API**: **Project URL** und den **anon public** Key kopieren.

### 2. Vercel einrichten

1. Auf <https://vercel.com> mit GitHub anmelden → **Add New… → Project** → dieses Repository importieren.
2. Unter **Environment Variables** eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL aus Schritt 1.4
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon public Key aus Schritt 1.4
3. **Deploy** drücken. Nach 1–2 Minuten bekommst du eine Adresse wie `https://kaarster-billiard.vercel.app`.

### 3. Supabase die Adresse mitteilen

In Supabase **Authentication → URL Configuration**:
- **Site URL** auf deine Vercel-Adresse setzen, z. B. `https://kaarster-billiard.vercel.app`
- unter **Redirect URLs** `https://kaarster-billiard.vercel.app/auth/callback` hinzufügen (deine Adresse einsetzen)

Fertig! Adresse öffnen, registrieren, Gruppe anlegen, Einladungslink in die WhatsApp-Gruppe schicken. 📱 Tipp: Im Handy-Browser „Zum Startbildschirm hinzufügen“ – dann fühlt sich die Seite wie eine App an.

---

## Lokale Entwicklung

```bash
npm install
cp .env.example .env.local   # Werte aus Supabase eintragen
npm run dev                  # http://localhost:3000
```

**Tests**

```bash
npm test          # Logik: Rangliste, Turnierbaum, Auslosung, Zusammenfassung
npm run test:db   # Datenbank-Regeln & Funktionen gegen lokalen Postgres 16 (muss installiert sein)
npm run lint
npm run build
```

**Aufbau**

| Ordner | Inhalt |
|---|---|
| `app/` | Seiten (Next.js App Router) und Server Actions (`app/actions`) |
| `components/` | Oberflächen-Bausteine |
| `lib/` | Fachlogik ohne Abhängigkeiten (`stats`, `bracket`, `teams`, `summary`) + Datenzugriff |
| `supabase/migrations/` | Datenbankschema, Zugriffsregeln und Funktionen |
| `supabase/tests/` | SQL-Tests |
| `docs/superpowers/` | Konzept und Bauplan |
