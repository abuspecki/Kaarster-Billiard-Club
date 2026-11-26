import Link from 'next/link';

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 text-sm font-bold">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          replace
          scroll={false}
          aria-current={t.key === active ? 'page' : undefined}
          className={`shrink-0 border-b-[3px] pb-2.5 transition ${
            t.key === active ? 'border-accent text-bar-fg' : 'border-transparent text-bar-muted hover:text-bar-fg'
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
