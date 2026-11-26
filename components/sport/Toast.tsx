'use client';

import { useEffect, useState } from 'react';

/** Kurze Bestätigung unten am Bildschirm. `stamp` wechselt bei jeder neuen Meldung. */
export function Toast({ message, stamp }: { message: string | null; stamp: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [message, stamp]);
  if (!visible || !message) return null;
  return (
    <div
      role="status"
      key={stamp}
      className="animate-toast fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-bar px-5 py-3 text-sm font-bold text-bar-fg shadow-lg"
    >
      {message}
    </div>
  );
}
