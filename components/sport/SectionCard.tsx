import type { ReactNode } from 'react';

export function SectionCard({
  title,
  action,
  children,
  className = '',
  flush = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={`shadow-card overflow-hidden rounded-xl border border-line bg-surface ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {title && <h2 className="font-cond text-[15px] font-extrabold tracking-wider uppercase">{title}</h2>}
          {action && <div className="text-xs font-bold text-accent-text">{action}</div>}
        </div>
      )}
      <div className={flush ? '' : 'px-4 pb-4'}>{children}</div>
    </section>
  );
}
