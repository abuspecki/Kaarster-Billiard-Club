-- Spieler in der Gruppe aussetzen: wer aussetzt, ist in Sitzungen automatisch pausiert.
alter table public.group_members add column sitting_out boolean not null default false;

create function public.set_member_sitting_out(p_group_id uuid, p_user_id uuid, p_value boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_uid();
  if not is_group_member(p_group_id) then raise exception 'Du bist kein Mitglied dieser Gruppe'; end if;
  update group_members set sitting_out = coalesce(p_value, false) where group_id = p_group_id and user_id = p_user_id;
  if not found then raise exception 'Spieler ist kein Mitglied dieser Gruppe'; end if;
end $$;

create or replace function public.join_by_code(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_uid();
  c text := upper(trim(coalesce(p_code, '')));
  s sessions;
  g groups;
begin
  if char_length(c) = 6 then
    select * into s from sessions where code = c;
    if not found then raise exception 'Code ungültig'; end if;
    if s.status <> 'active' then raise exception 'Diese Sitzung ist bereits beendet'; end if;
    insert into group_members (group_id, user_id) values (s.group_id, uid) on conflict do nothing;
    insert into session_players (session_id, user_id, paused)
    values (s.id, uid, coalesce((select sitting_out from group_members where group_id = s.group_id and user_id = uid), false))
    on conflict do nothing;
    return jsonb_build_object('kind', 'session', 'id', s.id, 'group_id', s.group_id);
  elsif char_length(c) = 8 then
    select * into g from groups where invite_code = c;
    if not found then raise exception 'Code ungültig'; end if;
    insert into group_members (group_id, user_id) values (g.id, uid) on conflict do nothing;
    return jsonb_build_object('kind', 'group', 'id', g.id, 'group_id', g.id);
  end if;
  raise exception 'Code ungültig';
end $$;

create or replace function public.start_session(p_group_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_uid();
  sid uuid;
  c text;
begin
  if not is_group_member(p_group_id) then raise exception 'Du bist kein Mitglied dieser Gruppe'; end if;
  loop
    c := gen_code(6);
    exit when not exists (select 1 from sessions where code = c);
  end loop;
  insert into sessions (group_id, code, created_by) values (p_group_id, c, uid) returning id into sid;
  insert into session_players (session_id, user_id, paused)
  values (sid, uid, coalesce((select sitting_out from group_members where group_id = p_group_id and user_id = uid), false));
  return sid;
end $$;

revoke execute on function public.set_member_sitting_out(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_member_sitting_out(uuid, uuid, boolean) to authenticated;
