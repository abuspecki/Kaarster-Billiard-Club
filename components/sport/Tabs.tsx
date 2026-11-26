import { TabLink } from './TabLink';

export function Tabs({ tabs, active }: { tabs: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <nav className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 text-sm font-bold">
      {tabs.map((t) => (
        <TabLink key={t.key} href={t.href} active={t.key === active}>
          {t.label}
        </TabLink>
      ))}
    </nav>
  );
}
