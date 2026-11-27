-- Spieler in einer Sitzung pausieren (z. B. Pause gemacht oder schon gegangen).
alter table public.session_players add column paused boolean not null default false;

create function public.set_player_paused(p_session_player_id uuid, p_paused boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  select session_id into sid from session_players where id = p_session_player_id;
  if sid is null then raise exception 'Spieler nicht gefunden'; end if;
  perform assert_session_writer(sid);
  update session_players set paused = coalesce(p_paused, false) where id = p_session_player_id;
end $$;

revoke execute on function public.set_player_paused(uuid, boolean) from public, anon;
grant execute on function public.set_player_paused(uuid, boolean) to authenticated;
