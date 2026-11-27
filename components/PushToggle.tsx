'use client';

import { useEffect, useState } from 'react';
import { removePushSubscription, savePushSubscription } from '@/app/actions/push';

type State = 'loading' | 'unsupported' | 'ios-install' | 'off' | 'on' | 'denied' | 'error';

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isIos() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

/** „🔔 Benachrichtigungen einschalten“ – einmal pro Handy. */
export function PushToggle() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    (async () => {
      if (!PUBLIC_KEY) return setState('unsupported');
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        return setState(isIos() && !isStandalone() ? 'ios-install' : 'unsupported');
      }
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await navigator.serviceWorker.register('/sw.js');
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return setState('off');
      // Mit dem Server abgleichen: gehört das Abo dem aktuell angemeldeten Spieler und existiert es noch?
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      setState(r.error ? 'error' : 'on');
    })().catch(() => setState('error'));
  }, []);

  async function enable() {
    setState('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return setState(permission === 'denied' ? 'denied' : 'off');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const r = await savePushSubscription({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      setState(r.error ? 'error' : 'on');
    } catch {
      setState('error');
    }
  }

  async function disable() {
    setState('loading');
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState('off');
    } catch {
      setState('error');
    }
  }

  if (state === 'unsupported' || state === 'loading') return null;

  const box = 'flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm';
  if (state === 'ios-install')
    return (
      <div className={box}>
        <span className="text-xl">🔔</span>
        <span className="text-muted">
          Für „Du bist dran“-Nachrichten: in Safari <b className="text-fg">Teilen → Zum Home-Bildschirm</b>, dann die App von dort öffnen und hier einschalten.
        </span>
      </div>
    );
  if (state === 'denied')
    return (
      <div className={box}>
        <span className="text-xl">🔕</span>
        <span className="text-muted">Benachrichtigungen sind in den Handy-Einstellungen für diese Seite blockiert.</span>
      </div>
    );
  return (
    <div className={box}>
      <span className="text-xl">{state === 'on' ? '🔔' : '🔕'}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{state === 'on' ? 'Benachrichtigungen an' : 'Benachrichtigungen aus'}</span>
        <span className="block text-xs text-muted">
          {state === 'error' ? 'Das hat nicht geklappt – bitte nochmal versuchen.' : 'Nachricht, wenn du im Turnier dran bist.'}
        </span>
      </span>
      {state === 'on' ? (
        <button onClick={disable} className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-bold text-muted">
          Ausschalten
        </button>
      ) : (
        <button onClick={enable} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-extrabold text-white">
          Einschalten
        </button>
      )}
    </div>
  );
}
