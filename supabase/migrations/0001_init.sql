-- Billiard-Tracker: Schema, Zugriffsregeln (RLS) und Funktionen.
-- Im Supabase-SQL-Editor einmal komplett ausführen.

-- =========================================================================
-- Tabellen
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  invite_code text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index on public.group_members (user_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  code text not null unique,
  created_by uuid references public.profiles (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index on public.sessions (group_id, created_at desc);

create table public.session_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  guest_name text check (guest_name is null or char_length(trim(guest_name)) between 1 and 40),
  created_at timestamptz not null default now(),
  check ((user_id is null) <> (guest_name is null)),
  unique (session_id, user_id)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  team_size int not null check (team_size between 1 and 4),
  teams jsonb not null,   -- [[session_player_id, ...], ...] Index = Team-Index im Baum
  bracket jsonb not null, -- BracketMatch[] (siehe lib/bracket.ts)
  status text not null default 'running' check (status in ('running', 'finished')),
  version int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index tournaments_one_running on public.tournaments (session_id) where status = 'running';

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  winner_side text not null check (winner_side in ('A', 'B')),
  tournament_id uuid references public.tournaments (id) on delete cascade,
  bracket_match_id text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tournament_id, bracket_match_id)
);
create index on public.matches (group_id, created_at);
create index on public.matches (session_id, created_at);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  session_player_id uuid not null references public.session_players (id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  user_id uuid references public.profiles (id) on delete set null,
  primary key (match_id, session_player_id)
);

alter table public.sessions replica identity full;
alter table public.session_players replica identity full;
alter table public.matches replica identity full;
alter table public.tournaments replica identity full;

-- =========================================================================
-- Profil bei Registrierung anlegen
-- =========================================================================

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Spieler'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Hilfsfunktionen
-- =========================================================================

create function public.is_group_member(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid())
$$;

create function public.is_group_admin(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid() and role = 'admin')
$$;

create function public.session_group(sid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select group_id from sessions where id = sid
$$;

create function public.shares_group(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

create function public.gen_code(len int) returns text
language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
begin
  for i in 1..len loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end $$;

create function public.require_uid() returns uuid
language plpgsql stable as $$
begin
  if auth.uid() is null then raise exception 'Nicht angemeldet'; end if;
  return auth.uid();
end $$;

-- Prüft: Sitzung existiert, läuft noch, Aufrufer ist Teilnehmer mit Konto.
create function public.assert_session_writer(sid uuid) returns public.sessions
language plpgsql security definer set search_path = public as $$
declare
  s sessions;
begin
  perform require_uid();
  select * into s from sessions where id = sid;
  if not found then raise exception 'Sitzung nicht gefunden'; end if;
  if not exists (select 1 from session_players where session_id = sid and user_id = auth.uid()) then
    raise exception 'Du bist kein Teilnehmer dieser Sitzung';
  end if;
  if s.status <> 'active' then raise exception 'Sitzung ist beendet'; end if;
  return s;
end $$;

create function public.validate_sides(sid uuid, side_a uuid[], side_b uuid[], max_size int) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  all_ids uuid[] := coalesce(side_a, '{}') || coalesce(side_b, '{}');
begin
  if coalesce(cardinality(side_a), 0) <> coalesce(cardinality(side_b), 0) then
    raise exception 'Beide Seiten müssen gleich groß sein';
  end if;
  if cardinality(side_a) < 1 or cardinality(side_a) > max_size then
    raise exception 'Pro Seite sind 1 bis % Spieler erlaubt', max_size;
  end if;
  if (select count(distinct x) from unnest(all_ids) x) <> cardinality(all_ids) then
    raise exception 'Ein Spieler ist doppelt eingetragen';
  end if;
  if (select count(*) from session_players where session_id = sid and id = any (all_ids)) <> cardinality(all_ids) then
    raise exception 'Spieler ist nicht in dieser Sitzung';
  end if;
end $$;

create function public.write_match_players(mid uuid, side_a uuid[], side_b uuid[]) returns void
language sql security definer set search_path = public as $$
  delete from match_players where match_id = mid;
  insert into match_players (match_id, session_player_id, side, user_id)
  select mid, sp.id, case when sp.id = any (side_a) then 'A' else 'B' end, sp.user_id
  from session_players sp where sp.id = any (side_a || side_b);
$$;

-- =========================================================================
-- Funktionen für die App (RPC)
-- =========================================================================

create function public.create_group(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_uid();
  gid uuid;
  c text;
begin
  if p_name is null or char_length(trim(p_name)) not between 1 and 60 then
    raise exception 'Gruppenname muss 1 bis 60 Zeichen haben';
  end if;
  loop
    c := gen_code(8);
    exit when not exists (select 1 from groups where invite_code = c);
  end loop;
  insert into groups (name, invite_code, created_by) values (trim(p_name), c, uid) returning id into gid;
  insert into group_members (group_id, user_id, role) values (gid, uid, 'admin');
  return gid;
end $$;

create function public.join_by_code(p_code text) returns jsonb
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
    insert into session_players (session_id, user_id) values (s.id, uid) on conflict do nothing;
    return jsonb_build_object('kind', 'session', 'id', s.id, 'group_id', s.group_id);
  elsif char_length(c) = 8 then
    select * into g from groups where invite_code = c;
    if not found then raise exception 'Code ungültig'; end if;
    insert into group_members (group_id, user_id) values (g.id, uid) on conflict do nothing;
    return jsonb_build_object('kind', 'group', 'id', g.id, 'group_id', g.id);
  end if;
  raise exception 'Code ungültig';
end $$;

create function public.start_session(p_group_id uuid) returns uuid
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
  insert into session_players (session_id, user_id) values (sid, uid);
  return sid;
end $$;

create function public.add_guest(p_session_id uuid, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  perform assert_session_writer(p_session_id);
  if p_name is null or char_length(trim(p_name)) not between 1 and 40 then
    raise exception 'Name muss 1 bis 40 Zeichen haben';
  end if;
  insert into session_players (session_id, guest_name) values (p_session_id, trim(p_name)) returning id into pid;
  return pid;
end $$;

create function public.record_match(p_session_id uuid, p_side_a uuid[], p_side_b uuid[], p_winner text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  s sessions := assert_session_writer(p_session_id);
  mid uuid;
begin
  if p_winner not in ('A', 'B') then raise exception 'Ungültiger Gewinner'; end if;
  perform validate_sides(p_session_id, p_side_a, p_side_b, 2);
  insert into matches (session_id, group_id, winner_side, created_by)
  values (s.id, s.group_id, p_winner, auth.uid()) returning id into mid;
  perform write_match_players(mid, p_side_a, p_side_b);
  return mid;
end $$;

create function public.update_match(p_match_id uuid, p_side_a uuid[], p_side_b uuid[], p_winner text) returns void
language plpgsql security definer set search_path = public as $$
declare
  m matches;
begin
  select * into m from matches where id = p_match_id;
  if not found then raise exception 'Partie nicht gefunden'; end if;
  perform assert_session_writer(m.session_id);
  if m.tournament_id is not null then raise exception 'Turnierpartien bitte im Turnierbaum ändern'; end if;
  if p_winner not in ('A', 'B') then raise exception 'Ungültiger Gewinner'; end if;
  perform validate_sides(m.session_id, p_side_a, p_side_b, 2);
  update matches set winner_side = p_winner where id = p_match_id;
  perform write_match_players(p_match_id, p_side_a, p_side_b);
end $$;

create function public.delete_match(p_match_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m matches;
begin
  select * into m from matches where id = p_match_id;
  if not found then raise exception 'Partie nicht gefunden'; end if;
  perform assert_session_writer(m.session_id);
  if m.tournament_id is not null then raise exception 'Turnierpartien bitte im Turnierbaum ändern'; end if;
  delete from matches where id = p_match_id;
end $$;

create function public.end_session(p_session_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_uid();
  s sessions;
begin
  select * into s from sessions where id = p_session_id;
  if not found then raise exception 'Sitzung nicht gefunden'; end if;
  if s.created_by is distinct from uid and not is_group_admin(s.group_id) then
    raise exception 'Nur der Ersteller oder ein Gruppen-Admin kann die Sitzung beenden';
  end if;
  update sessions set status = 'ended', ended_at = coalesce(ended_at, now()) where id = p_session_id;
end $$;

create function public.create_tournament(p_session_id uuid, p_team_size int, p_teams jsonb, p_bracket jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  ids uuid[];
  tid uuid;
begin
  perform assert_session_writer(p_session_id);
  if jsonb_typeof(p_teams) <> 'array' or jsonb_array_length(p_teams) < 2 then
    raise exception 'Mindestens 2 Teams nötig';
  end if;
  if jsonb_typeof(p_bracket) <> 'array' then raise exception 'Ungültiger Turnierbaum'; end if;
  select array_agg(x::uuid) into ids
  from jsonb_array_elements(p_teams) t, jsonb_array_elements_text(t) x;
  if exists (select 1 from jsonb_array_elements(p_teams) t where jsonb_typeof(t) <> 'array' or jsonb_array_length(t) = 0) then
    raise exception 'Jedes Team braucht mindestens einen Spieler';
  end if;
  if (select count(distinct x) from unnest(ids) x) <> cardinality(ids) then
    raise exception 'Ein Spieler ist doppelt eingetragen';
  end if;
  if (select count(*) from session_players where session_id = p_session_id and id = any (ids)) <> cardinality(ids) then
    raise exception 'Spieler ist nicht in dieser Sitzung';
  end if;
  begin
    insert into tournaments (session_id, team_size, teams, bracket, created_by)
    values (p_session_id, p_team_size, p_teams, p_bracket, auth.uid()) returning id into tid;
  exception when unique_violation then
    raise exception 'In dieser Sitzung läuft bereits ein Turnier';
  end;
  return tid;
end $$;

create function public.record_tournament_result(
  p_tournament_id uuid, p_expected_version int, p_bracket jsonb, p_bracket_match_id text, p_finished boolean
) returns int
language plpgsql security definer set search_path = public as $$
declare
  t tournaments;
  s sessions;
  entry jsonb;
  old_entry jsonb;
  team_a int;
  team_b int;
  win int;
  side_a uuid[];
  side_b uuid[];
  mid uuid;
begin
  select * into t from tournaments where id = p_tournament_id for update;
  if not found then raise exception 'Turnier nicht gefunden'; end if;
  s := assert_session_writer(t.session_id);
  if t.version <> p_expected_version then raise exception 'Stand hat sich geändert'; end if;

  select e into entry from jsonb_array_elements(p_bracket) e where e ->> 'id' = p_bracket_match_id;
  if entry is null then raise exception 'Partie nicht im Turnierbaum'; end if;
  team_a := (entry ->> 'teamA')::int;
  team_b := (entry ->> 'teamB')::int;
  win := (entry ->> 'winner')::int;
  if team_a is null or team_b is null or win is null or win not in (team_a, team_b) then
    raise exception 'Ungültiges Ergebnis';
  end if;
  select array_agg(x::uuid) into side_a from jsonb_array_elements_text(t.teams -> team_a) x;
  select array_agg(x::uuid) into side_b from jsonb_array_elements_text(t.teams -> team_b) x;
  if side_a is null or side_b is null then raise exception 'Team nicht gefunden'; end if;

  select e into old_entry from jsonb_array_elements(t.bracket) e where e ->> 'id' = p_bracket_match_id;
  mid := nullif(old_entry ->> 'matchId', '')::uuid;
  if mid is not null and exists (select 1 from matches where id = mid) then
    update matches set winner_side = case when win = team_a then 'A' else 'B' end where id = mid;
  else
    insert into matches (session_id, group_id, winner_side, tournament_id, bracket_match_id, created_by)
    values (s.id, s.group_id, case when win = team_a then 'A' else 'B' end, t.id, p_bracket_match_id, auth.uid())
    returning id into mid;
  end if;
  perform write_match_players(mid, side_a, side_b);

  update tournaments set
    bracket = (
      select jsonb_agg(
        case when e ->> 'id' = p_bracket_match_id then jsonb_set(e, '{matchId}', to_jsonb(mid::text)) else e end
        order by ord)
      from jsonb_array_elements(p_bracket) with ordinality as x(e, ord)
    ),
    version = version + 1,
    status = case when p_finished then 'finished' else 'running' end
  where id = t.id;
  return t.version + 1;
end $$;

create function public.remove_member(p_group_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform require_uid();
  if not is_group_admin(p_group_id) then raise exception 'Nur ein Admin darf das'; end if;
  if p_user_id = auth.uid() then raise exception 'Du kannst dich nicht selbst entfernen'; end if;
  delete from group_members where group_id = p_group_id and user_id = p_user_id;
end $$;

create function public.regenerate_invite(p_group_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  perform require_uid();
  if not is_group_admin(p_group_id) then raise exception 'Nur ein Admin darf das'; end if;
  loop
    c := gen_code(8);
    exit when not exists (select 1 from groups where invite_code = c);
  end loop;
  update groups set invite_code = c where id = p_group_id;
  return c;
end $$;

-- =========================================================================
-- Zugriffsrechte
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.sessions enable row level security;
alter table public.session_players enable row level security;
alter table public.tournaments enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "profiles_read" on public.profiles for select to authenticated
  using (id = auth.uid() or shares_group(id));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "groups_read" on public.groups for select to authenticated using (is_group_member(id));
create policy "groups_admin_update" on public.groups for update to authenticated
  using (is_group_admin(id)) with check (is_group_admin(id));

create policy "members_read" on public.group_members for select to authenticated using (is_group_member(group_id));
create policy "sessions_read" on public.sessions for select to authenticated using (is_group_member(group_id));
create policy "session_players_read" on public.session_players for select to authenticated
  using (is_group_member(session_group(session_id)));
create policy "tournaments_read" on public.tournaments for select to authenticated
  using (is_group_member(session_group(session_id)));
create policy "matches_read" on public.matches for select to authenticated using (is_group_member(group_id));
create policy "match_players_read" on public.match_players for select to authenticated
  using (exists (select 1 from matches m where m.id = match_id and is_group_member(m.group_id)));

revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (name) on public.groups to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_group_member(uuid), public.is_group_admin(uuid), public.session_group(uuid), public.shares_group(uuid),
  public.create_group(text), public.join_by_code(text), public.start_session(uuid), public.add_guest(uuid, text),
  public.record_match(uuid, uuid[], uuid[], text), public.update_match(uuid, uuid[], uuid[], text),
  public.delete_match(uuid), public.end_session(uuid), public.create_tournament(uuid, int, jsonb, jsonb),
  public.record_tournament_result(uuid, int, jsonb, text, boolean), public.remove_member(uuid, uuid),
  public.regenerate_invite(uuid)
to authenticated;

-- =========================================================================
-- Live-Aktualisierung
-- =========================================================================

alter publication supabase_realtime add table
  public.sessions, public.session_players, public.matches, public.tournaments;
