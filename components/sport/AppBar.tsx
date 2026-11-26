import Link from 'next/link';
import type { ReactNode } from 'react';

/** Dunkle Kopfleiste im Sport-App-Stil (in hell und dunkel gleich). */
export function AppBar({
  title,
  subtitle,
  initials,
  back,
  right,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  initials?: string;
  back?: { href: string; label: string };
  right?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 bg-bar px-4 pt-3 text-bar-fg">
      {back && (
        <Link href={back.href} className="mb-1 inline-block max-w-full truncate text-xs font-semibold text-bar-muted">
          ‹ {back.label}
        </Link>
      )}
      <div className="flex items-center gap-3 pb-3">
        {initials && (
          <div className="font-cond grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-[17px] font-extrabold tracking-wide">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-cond truncate text-[22px] leading-tight font-extrabold tracking-wide uppercase">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="truncate text-xs text-bar-muted">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {children}
    </header>
  );
}

export function LiveBadge({ label = 'LIVE' }: { label?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-black tracking-wider text-white">
      <span className="animate-live h-1.5 w-1.5 rounded-full bg-white" />
      {label}
    </span>
  );
}

export function MutedBadge({ label }: { label: string }) {
  return <span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-black tracking-wider">{label}</span>;
}
