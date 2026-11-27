-- Push-Benachrichtigungen „Du bist dran“.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index on public.push_subscriptions (user_id);

-- Merkt sich, welche Nachricht schon verschickt wurde (je Turnier, Partie und Art einmal).
create table public.push_notifications (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  bracket_match_id text not null,
  kind text not null check (kind in ('now', 'next')),
  created_at timestamptz not null default now(),
  primary key (tournament_id, bracket_match_id, kind)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_notifications enable row level security;
create policy "push_subscriptions_own" on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
revoke all on public.push_subscriptions, public.push_notifications from anon, authenticated;
grant select on public.push_subscriptions to authenticated;

create function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_uid();
begin
  if coalesce(p_endpoint, '') !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Ungültiges Abo';
  end if;
  insert into push_subscriptions (user_id, endpoint, p256dh, auth) values (uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth;
end $$;

-- Entfernt ein Abo per Endpoint (eigenes Abmelden oder Aufräumen abgelaufener Abos nach dem Versand).
create function public.remove_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_uid();
  delete from push_subscriptions where endpoint = p_endpoint;
end $$;

-- Liefert beim ersten Aufruf je Turnier+Partie+Art die Abos der Spieler dieser Partie, danach nichts mehr.
create function public.claim_push_targets(p_tournament_id uuid, p_bracket_match_id text, p_kind text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  t tournaments;
  entry jsonb;
  players uuid[];
  inserted int;
begin
  if p_kind not in ('now', 'next') then raise exception 'Ungültige kind'; end if;
  select * into t from tournaments where id = p_tournament_id;
  if not found then raise exception 'Turnier nicht gefunden'; end if;
  perform assert_session_writer(t.session_id);

  select e into entry from jsonb_array_elements(t.bracket) e where e ->> 'id' = p_bracket_match_id;
  if entry is null or entry ->> 'teamA' is null or entry ->> 'teamB' is null then return; end if;

  select array_agg(x::uuid) into players
  from (
    select jsonb_array_elements_text(t.teams -> (entry ->> 'teamA')::int) x
    union all
    select jsonb_array_elements_text(t.teams -> (entry ->> 'teamB')::int)
  ) s;

  insert into push_notifications (tournament_id, bracket_match_id, kind) values (p_tournament_id, p_bracket_match_id, p_kind)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  return query
    select ps.endpoint, ps.p256dh, ps.auth
    from push_subscriptions ps
    join session_players sp on sp.user_id = ps.user_id
    where sp.id = any (players);
end $$;

revoke execute on function public.save_push_subscription(text, text, text), public.remove_push_subscription(text),
  public.claim_push_targets(uuid, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text), public.remove_push_subscription(text),
  public.claim_push_targets(uuid, text, text) to authenticated;
