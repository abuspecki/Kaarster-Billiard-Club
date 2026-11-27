'use server';

import { createServerSupabase } from '@/lib/supabase/server';
import type { ActionResult } from './session';

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<ActionResult> {
  const sb = await createServerSupabase();
  const { error } = await sb.rpc('save_push_subscription', { p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth });
  return error ? { error: error.message } : {};
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const sb = await createServerSupabase();
  const { error } = await sb.rpc('remove_push_subscription', { p_endpoint: endpoint });
  return error ? { error: error.message } : {};
}
