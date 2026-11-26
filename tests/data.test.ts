import { expect, it } from 'vitest';
import { toMatchRecords } from '@/lib/mapping';

it('toMatchRecords maps users and guests', () => {
  const records = toMatchRecords([
    {
      id: 'm1',
      created_at: '2026-11-26T19:00:00Z',
      winner_side: 'B',
      match_players: [
        { side: 'A', user_id: 'x', session_player_id: 's1' },
        { side: 'B', user_id: null, session_player_id: 'p' },
      ],
    },
  ]);
  expect(records).toEqual([{ id: 'm1', playedAt: '2026-11-26T19:00:00Z', sideA: ['u:x'], sideB: ['g:p'], winner: 'B' }]);
});
