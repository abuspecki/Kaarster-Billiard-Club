'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { createBrowserSupabase } from './supabase/client';

/** Lädt die Seite neu, sobald sich in der Sitzung etwas ändert (andere Handys). */
export function useRealtimeRefresh(sessionId: string): void {
  const router = useRouter();
  useEffect(() => {
    const sb = createBrowserSupabase();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        router.refresh();
      }, 300);
    };
    const filter = `session_id=eq.${sessionId}`;
    const channel = sb
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_players', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter }, refresh)
      .subscribe();
    // Nach Rückkehr in den Tab (Handy war gesperrt) sicherheitshalber neu laden.
    const onVisible = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      if (timer) clearTimeout(timer);
      sb.removeChannel(channel);
    };
  }, [sessionId, router]);
}
