import Link from 'next/link';
import { LiveBadge } from './AppBar';

export function LiveCard({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href} className="shadow-card flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition hover:bg-surface-2">
      <div className="min-w-0 flex-1">
        <LiveBadge />
        <div className="font-cond mt-1.5 truncate text-2xl leading-none font-extrabold">{title}</div>
        <div className="mt-1 truncate text-xs text-muted">{meta}</div>
      </div>
      <span className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-extrabold text-white">Öffnen</span>
    </Link>
  );
}
