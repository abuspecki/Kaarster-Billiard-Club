-- Vergessene Sitzungen beenden: keine Aktivität (Start oder letzte Partie) seit 12 Stunden.
create function public.end_stale_sessions(p_group_id uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  perform require_uid();
  if not is_group_member(p_group_id) then raise exception 'Du bist kein Mitglied dieser Gruppe'; end if;
  with activity as (
    select s.id, greatest(s.created_at, coalesce(max(m.created_at), s.created_at)) as last_at
    from sessions s left join matches m on m.session_id = s.id
    where s.group_id = p_group_id and s.status = 'active'
    group by s.id
  )
  update sessions s set status = 'ended', ended_at = a.last_at
  from activity a
  where s.id = a.id and a.last_at < now() - interval '12 hours';
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.end_stale_sessions(uuid) from public, anon;
grant execute on function public.end_stale_sessions(uuid) to authenticated;
