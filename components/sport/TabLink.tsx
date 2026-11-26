'use client';

import Link, { useLinkStatus } from 'next/link';
import type { ReactNode } from 'react';

function PendingBar() {
  const { pending } = useLinkStatus();
  return pending ? <span className="animate-live absolute inset-x-0 -bottom-[3px] h-[3px] bg-accent" /> : null;
}

/** Reiter-Link, der beim Antippen sofort reagiert (pulsierender Strich, bis der Reiter geladen ist). */
export function TabLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'page' : undefined}
      className={`relative shrink-0 border-b-[3px] pb-2.5 transition ${
        active ? 'border-accent text-bar-fg' : 'border-transparent text-bar-muted hover:text-bar-fg'
      }`}
    >
      {children}
      <PendingBar />
    </Link>
  );
}
