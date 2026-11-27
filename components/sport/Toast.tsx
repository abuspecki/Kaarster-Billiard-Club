'use client';

import { useEffect, useState } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

/** Kurze Bestätigung unten am Bildschirm, optional mit Knopf (z. B. „Rückgängig“). `stamp` wechselt bei jeder neuen Meldung. */
export function Toast({ message, stamp, action }: { message: string | null; stamp: number; action?: ToastAction }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), action ? 6000 : 1800);
    return () => clearTimeout(t);
  }, [message, stamp, action]);
  if (!visible || !message) return null;
  return (
    <div
      role="status"
      key={stamp}
      className="animate-toast fixed bottom-6 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-bar py-2 pr-2 pl-5 text-sm font-bold text-bar-fg shadow-lg"
    >
      <span className="truncate py-1">{message}</span>
      {action ? (
        <button
          onClick={() => {
            setVisible(false);
            action.onClick();
          }}
          className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 font-extrabold text-bar-fg hover:bg-white/25"
        >
          {action.label}
        </button>
      ) : (
        <span className="pr-3" />
      )}
    </div>
  );
}
