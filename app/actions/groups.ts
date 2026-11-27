'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import type { FormState } from './auth';

export async function createGroup(_: FormState, form: FormData): Promise<FormState> {
  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc('create_group', { p_name: String(form.get('name') ?? '') });
  if (error) return { error: error.message };
  redirect(`/g/${data}`);
}

export async function joinCode(_: FormState, form: FormData): Promise<FormState> {
  const code = String(form.get('code') ?? '').replace(/\s/g, '');
  if (code.length !== 6 && code.length !== 8) return { error: 'Codes haben 6 (Sitzung) oder 8 (Gruppe) Zeichen.' };
  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc('join_by_code', { p_code: code });
  if (error) return { error: error.message };
  const result = data as { kind: 'session' | 'group'; id: string };
  redirect(result.kind === 'session' ? `/s/${result.id}` : `/g/${result.id}`);
}

export async function startSession(groupId: string): Promise<FormState> {
  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc('start_session', { p_group_id: groupId });
  if (error) return { error: error.message };
  redirect(`/s/${data}`);
}

export async function renameGroup(groupId: string, _: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get('name') ?? '').trim();
  if (name.length < 1 || name.length > 60) return { error: 'Name muss 1 bis 60 Zeichen haben.' };
  const sb = await createServerSupabase();
  const { error } = await sb.from('groups').update({ name }).eq('id', groupId);
  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`, 'layout');
  return { info: 'Gespeichert.' };
}

export async function updateGroupLocation(groupId: string, _: FormState, form: FormData): Promise<FormState> {
  const raw = String(form.get('location') ?? '').trim();
  if (raw.length > 60) return { error: 'Ort darf höchstens 60 Zeichen haben.' };
  const sb = await createServerSupabase();
  const { error } = await sb.from('groups').update({ location: raw || null }).eq('id', groupId);
  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`, 'layout');
  return { info: 'Gespeichert.' };
}

export async function setMemberSittingOut(groupId: string, userId: string, value: boolean): Promise<FormState> {
  const sb = await createServerSupabase();
  const { error } = await sb.rpc('set_member_sitting_out', { p_group_id: groupId, p_user_id: userId, p_value: value });
  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`);
  return {};
}

export async function removeMember(groupId: string, userId: string): Promise<FormState> {
  const sb = await createServerSupabase();
  const { error } = await sb.rpc('remove_member', { p_group_id: groupId, p_user_id: userId });
  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`, 'layout');
  return {};
}

export async function regenerateInvite(groupId: string): Promise<FormState> {
  const sb = await createServerSupabase();
  const { error } = await sb.rpc('regenerate_invite', { p_group_id: groupId });
  if (error) return { error: error.message };
  revalidatePath(`/g/${groupId}`, 'layout');
  return {};
}
