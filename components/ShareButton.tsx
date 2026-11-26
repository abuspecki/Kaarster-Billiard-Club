'use client';

import { useState } from 'react';
import { Button } from './ui';

/** Teilt über das Teilen-Menü des Handys, sonst Kopieren in die Zwischenablage. */
export function ShareButton({
  text,
  url,
  title,
  label = 'Teilen',
  variant = 'secondary',
  className = '',
}: {
  text?: string;
  url?: string;
  title?: string;
  label?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const fullUrl = url ? new URL(url, window.location.origin).toString() : undefined;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: fullUrl });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText([text, fullUrl].filter(Boolean).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button type="button" variant={variant} onClick={share} className={className}>
      {copied ? 'Kopiert!' : label}
    </Button>
  );
}
