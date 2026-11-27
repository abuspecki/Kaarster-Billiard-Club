'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { setMemberSittingOut } from '@/app/actions/groups';
import type { PlayerKey } from '@/lib/types';
import { PlayerBadge } from './sport/PlayerBadge';
import { Button, ErrorText } from './ui';

/** Zeile im Reiter „Spieler“: antippen → Aussetzen / Zurück, Profil über „›“. */
export function MemberRow({
  groupId,
  player,
  name,
  stats,
  sittingOut,
}: {
  groupId: string;
  player: PlayerKey;
  name: string;
  stats: string;
  sittingOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const userId = player.slice(2);

  return (
    <li className="border-t border-line first:border-t-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((v) => !v)} className={`flex min-w-0 flex-1 items-center gap-3 text-left ${sittingOut ? 'opacity-55' : ''}`}>
          <PlayerBadge player={player} name={name} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{name}</span>
            <span className="block text-xs text-muted">{stats}</span>
          </span>
          {sittingOut && <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-black tracking-wide text-muted">⏸ SETZT AUS</span>}
        </button>
        <Link href={`/g/${groupId}/p/${userId}`} aria-label={`Profil von ${name}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2">
          ›
        </Link>
      </div>
      {open && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-line bg-surface-2 p-2">
          <span className="min-w-0 flex-1 pl-1 text-xs text-muted">
            {sittingOut ? 'Setzt gerade aus.' : 'Aussetzen: in Sitzungen automatisch auf Pause, nicht ausgelost.'}
          </span>
          <Button
            variant={sittingOut ? 'primary' : 'secondary'}
            disabled={pending}
            className="shrink-0 px-3 py-2 text-sm"
            onClick={() =>
              start(async () => {
                const r = await setMemberSittingOut(groupId, userId, !sittingOut);
                setError(r.error);
                if (!r.error) setOpen(false);
              })
            }
          >
            {sittingOut ? '▶ Zurück' : '⏸ Aussetzen'}
          </Button>
        </div>
      )}
      {error && (
        <div className="mx-4 mb-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </li>
  );
}
