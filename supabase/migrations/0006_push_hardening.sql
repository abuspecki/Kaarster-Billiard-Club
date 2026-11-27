-- Push absichern: Abos nur noch an den Server (geheimer Wert aus Vercel), Löschen nur eigene,
-- „schon benachrichtigt“ je Paarung, und erst merken, wenn es überhaupt Empfänger gibt.

-- Prüfwert (SHA-256) des geheimen Werts PUSH_CLAIM_SECRET aus Vercel. Der Wert selbst steht nirgends im Repo.
create table public.app_secrets (name text primary key, hash text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets (name, hash) values ('push', '05e5743e1f45bd882474b027c401a6144c53a6e80bc67b4b70ca2ab8cbba2cd2');

create function public.assert_push_secret(p_secret text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from app_secrets where name = 'push' and hash = encode(sha256(convert_to(coalesce(p_secret, ''), 'utf8')), 'hex')) then
    raise exception 'Push nicht erlaubt';
  end if;
end $$;

-- Benachrichtigt je Paarung: nach einer Korrektur bekommt die neue Paarung wieder eine Nachricht.
alter table public.push_notifications add column team_a int, add column team_b int;
update public.push_notifications set team_a = -1, team_b = -1;
alter table public.push_notifications alter column team_a set not null, alter column team_b set not null;
alter table public.push_notifications drop constraint push_notifications_pkey;
alter table public.push_notifications add primary key (tournament_id, bracket_match_id, kind, team_a, team_b);

-- Nur eigene Abos löschen.
create or replace function public.remove_push_subscription(p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from push_subscriptions where endpoint = p_endpoint and user_id = require_uid();
end $$;

-- Server räumt abgelaufene Abos von Spielern des Turniers auf (nach HTTP 404/410).
create function public.prune_push_subscription(p_secret text, p_tournament_id uuid, p_endpoint text) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
begin
  perform assert_push_secret(p_secret);
  select session_id into sid from tournaments where id = p_tournament_id;
  if sid is null then raise exception 'Turnier nicht gefunden'; end if;
  perform assert_session_writer(sid);
  delete from push_subscriptions ps
  where ps.endpoint = p_endpoint
    and exists (select 1 from session_players sp where sp.session_id = sid and sp.user_id = ps.user_id);
end $$;

drop function public.claim_push_targets(uuid, text, text);
create function public.claim_push_targets(p_secret text, p_tournament_id uuid, p_bracket_match_id text, p_kind text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql security definer set search_path = public as $$
declare
  t tournaments;
  entry jsonb;
  ta int;
  tb int;
  players uuid[];
  inserted int;
begin
  perform assert_push_secret(p_secret);
  if p_kind not in ('now', 'next') then raise exception 'Ungültige kind'; end if;
  select * into t from tournaments where id = p_tournament_id;
  if not found then raise exception 'Turnier nicht gefunden'; end if;
  perform assert_session_writer(t.session_id);

  select e into entry from jsonb_array_elements(t.bracket) e where e ->> 'id' = p_bracket_match_id;
  if entry is null or entry ->> 'teamA' is null or entry ->> 'teamB' is null then return; end if;
  ta := (entry ->> 'teamA')::int;
  tb := (entry ->> 'teamB')::int;

  select array_agg(x::uuid) into players
  from (
    select jsonb_array_elements_text(t.teams -> ta) x
    union all
    select jsonb_array_elements_text(t.teams -> tb)
  ) s;

  -- Ohne Empfänger nichts merken: wer Push später einschaltet, bekommt die Nachricht dann noch.
  if not exists (
    select 1 from push_subscriptions ps join session_players sp on sp.user_id = ps.user_id where sp.id = any (players)
  ) then
    return;
  end if;

  insert into push_notifications (tournament_id, bracket_match_id, kind, team_a, team_b)
  values (p_tournament_id, p_bracket_match_id, p_kind, ta, tb)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return; end if;

  return query
    select ps.endpoint, ps.p256dh, ps.auth
    from push_subscriptions ps
    join session_players sp on sp.user_id = ps.user_id
    where sp.id = any (players);
end $$;

revoke execute on function public.assert_push_secret(text), public.prune_push_subscription(text, uuid, text),
  public.claim_push_targets(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.prune_push_subscription(text, uuid, text), public.claim_push_targets(text, uuid, text, text) to authenticated;
