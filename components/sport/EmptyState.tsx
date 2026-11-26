import type { ReactNode } from 'react';

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="px-4 py-6 text-center">
      <div className="font-cond text-lg font-extrabold tracking-wide uppercase">{title}</div>
      {text && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
