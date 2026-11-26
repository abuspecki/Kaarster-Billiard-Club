import { notFound } from 'next/navigation';
import { BracketView } from '@/components/BracketView';
import { AppBar, LiveBadge } from '@/components/sport/AppBar';
import { EmptyState } from '@/components/sport/EmptyState';
import { FormDots } from '@/components/sport/FormDots';
import { LeagueTable } from '@/components/sport/LeagueTable';
import { LiveCard } from '@/components/sport/LiveCard';
import { PlayerBadge } from '@/components/sport/PlayerBadge';
import { ResultCard } from '@/components/sport/ResultCard';
import { ResultStrip } from '@/components/sport/ResultStrip';
import { SectionCard } from '@/components/sport/SectionCard';
import { StatTiles } from '@/components/sport/StatTiles';
import { Tabs } from '@/components/sport/Tabs';
import { Button, ErrorText, Input } from '@/components/ui';
import { generateBracket, setWinner } from '@/lib/bracket';
import { stripItems } from '@/lib/group-view';
import type { SessionPlayer } from '@/lib/session-data';
import { computeStandings, recentForm } from '@/lib/stats';
import type { MatchRecord } from '@/lib/types';

/** Nur in der Entwicklung: alle Bausteine mit Beispieldaten (für Screenshots hell/dunkel). */
export default function Preview() {
  if (process.env.NODE_ENV === 'production') notFound();

  const names: Record<string, string> = {
    'u:max': 'Max',
    'u:lea': 'Lea',
    'u:tim': 'Tim',
    'u:jonas': 'Jonas',
    'u:long': 'Maximilian-Alexander von K.',
    'g:tom': 'Tom',
  };
  const seq: [string[], string[]][] = [
    [['u:max'], ['u:lea']],
    [['u:lea'], ['u:tim']],
    [['u:max'], ['u:jonas']],
    [['u:tim'], ['u:max']],
    [['u:long'], ['u:lea']],
    [['u:max', 'u:lea'], ['u:tim', 'g:tom']],
    [['u:jonas'], ['u:long']],
    [['u:max'], ['u:tim']],
    [['u:lea'], ['u:jonas']],
    [['u:max'], ['u:long']],
  ];
  const matches: MatchRecord[] = seq.map(([a, b], i) => ({
    id: `m${i}`,
    playedAt: new Date(Date.UTC(2026, 10, 26, 19, i * 7)).toISOString(),
    sideA: a,
    sideB: b,
    winner: 'A',
    sessionId: i > 6 ? 'live' : 'old',
  }));
  const standings = computeStandings(matches);
  const forms = Object.fromEntries(standings.map((s) => [s.player, recentForm(matches, s.player)]));
  const players: SessionPlayer[] = [
    { id: 'p1', userId: 'max', name: 'Max', isGuest: false },
    { id: 'p2', userId: 'lea', name: 'Lea', isGuest: false },
    { id: 'p3', userId: 'tim', name: 'Tim', isGuest: false },
    { id: 'p4', userId: 'jonas', name: 'Jonas', isGuest: false },
    { id: 'p5', userId: null, name: 'Tom', isGuest: true },
  ];
  let bracket = generateBracket(5);
  bracket = setWinner(bracket, 'r1-s1', 3);
  bracket = setWinner(bracket, 'r2-s1', 1);

  return (
    <>
      <AppBar title="Kaarster Billiard Club" subtitle="Spielhalle Kaarst · 6 Mitglieder" initials="KBC" back={{ href: '/', label: 'Meine Gruppen' }}>
        <Tabs
          active="uebersicht"
          tabs={[
            { key: 'uebersicht', label: 'Übersicht', href: '#' },
            { key: 'tabelle', label: 'Tabelle', href: '#' },
            { key: 'turniere', label: 'Turniere', href: '#' },
            { key: 'spieler', label: 'Spieler', href: '#' },
          ]}
        />
      </AppBar>
      <ResultStrip items={stripItems(matches, names, new Set(['m7', 'm8', 'm9']))} />
      <div className="space-y-3 p-4">
        <LiveCard href="#" title="Sitzung läuft" meta="seit 20:30 · 3 Partien · Code K7P2QX" />
        <Button className="w-full py-4">▶ Neue Sitzung starten</Button>
        <SectionCard title="Tabelle" action="Alle ›" flush>
          <LeagueTable standings={standings} names={names} forms={forms} profileHref={() => '#'} />
        </SectionCard>
        <SectionCard title="Letzter Abend · Do., 26.11." action="Spielbericht ›">
          <StatTiles
            items={[
              { value: 10, label: 'Partien' },
              { value: 'Max', label: 'Bester Spieler' },
              { value: 3, label: 'Längste Serie' },
            ]}
          />
        </SectionCard>
        <SectionCard title="Leerzustand" flush>
          <EmptyState title="Noch keine Partien" text="Startet eine Sitzung und tragt eure erste Partie ein – dann füllt sich hier die Tabelle." />
        </SectionCard>

        <h2 className="font-cond pt-4 text-lg font-extrabold uppercase">Sitzung</h2>
        <div className="flex items-center gap-2">
          <LiveBadge /> <span className="text-sm text-muted">Badge</span>
        </div>
        <SectionCard title="Partien (3)" flush>
          <div className="divide-y divide-line">
            <ResultCard
              winner={
                <>
                  <PlayerBadge player="u:max" name="Max" size="sm" />
                  <span className="truncate">Max</span>
                </>
              }
              loser={
                <>
                  <PlayerBadge player="u:long" name="Maximilian" size="sm" />
                  <span className="truncate font-normal">Maximilian-Alexander von K.</span>
                </>
              }
              meta="21:14 · eingetragen von Lea"
              trailing={<span>✎</span>}
              onClick={undefined}
            />
            <ResultCard
              winner={
                <>
                  <span className="flex -space-x-1.5">
                    <PlayerBadge player="u:max" name="Max" size="sm" />
                    <PlayerBadge player="u:lea" name="Lea" size="sm" />
                  </span>
                  <span className="truncate">Max + Lea</span>
                </>
              }
              loser={
                <>
                  <span className="flex -space-x-1.5">
                    <PlayerBadge player="u:tim" name="Tim" size="sm" />
                    <PlayerBadge player="g:tom" name="Tom" size="sm" />
                  </span>
                  <span className="truncate font-normal">Tim + Tom</span>
                </>
              }
              meta="20:51 · eingetragen von Max"
              tag="Turnier"
            />
          </div>
        </SectionCard>
        <SectionCard title="Formular">
          <div className="space-y-2">
            <Input placeholder="Name des Gasts" />
            <ErrorText>Diese Sitzung ist bereits beendet</ErrorText>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary">Sekundär</Button>
              <Button variant="danger">Löschen</Button>
            </div>
          </div>
        </SectionCard>

        <h2 className="font-cond pt-4 text-lg font-extrabold uppercase">Turnierbaum</h2>
        <BracketView
          sessionId="x"
          tournamentId="t"
          version={0}
          bracket={bracket}
          teams={[['p1'], ['p2'], ['p3'], ['p4'], ['p5']]}
          teamNames={['Max', 'Lea', 'Tim', 'Jonas', 'Tom']}
          players={players}
          canWrite
        />

        <BracketView
          sessionId="x"
          tournamentId="t2"
          version={0}
          bracket={setWinner(generateBracket(2), 'r1-s0', 0)}
          teams={[['p1'], ['p2']]}
          teamNames={['Maximilian-Alexander-vonKaarst + Leonie-Sophie', 'Lea']}
          players={players}
          canWrite={false}
        />
        <div className="flex flex-wrap gap-2">
          <span className="flex max-w-full items-center gap-1.5 rounded-full bg-surface-2 py-1 pr-3 pl-1 text-sm font-semibold">
            <PlayerBadge player="u:long" name="Maximilian" size="sm" />
            <span className="truncate">Maximilian-Alexander von Kaarst-Büttgen der Zweite</span>
          </span>
        </div>

        <h2 className="font-cond pt-4 text-lg font-extrabold uppercase">Profil</h2>
        <SectionCard>
          <div className="flex items-center gap-4">
            <PlayerBadge player="u:max" name="Max" size="lg" />
            <div>
              <div className="font-cond text-3xl font-extrabold uppercase">Max</div>
              <div className="text-sm text-muted">Platz 1 in der Tabelle</div>
            </div>
          </div>
          <div className="mt-3">
            <FormDots form={['W', 'W', 'L', 'W', 'W', 'L', 'W']} size="md" />
          </div>
        </SectionCard>
      </div>
    </>
  );
}
