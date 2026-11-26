-- SQL-Tests für Schema, RLS und RPCs. Jede Prüfung bricht bei Fehler mit Exception ab.
\set A '''aaaaaaaa-0000-0000-0000-000000000001'''
\set B '''bbbbbbbb-0000-0000-0000-000000000002'''
\set C '''cccccccc-0000-0000-0000-000000000003'''
\set D '''dddddddd-0000-0000-0000-000000000004'''

create schema t;
create function t.t_assert(cond boolean, msg text) returns void language plpgsql as
$$ begin if cond is distinct from true then raise exception 'ASSERT FAILED: %', msg; end if; end $$;

create function t.t_throws(q text, expected text, msg text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    if position(expected in sqlerrm) = 0 then
      raise exception 'ASSERT FAILED: % – unerwarteter Fehler: %', msg, sqlerrm;
    end if;
    return;
  end;
  raise exception 'ASSERT FAILED: % – kein Fehler', msg;
end $$;
grant usage on schema t to authenticated;

insert into auth.users (id, raw_user_meta_data) values
  (:A, '{"display_name":"Anna"}'), (:B, '{"display_name":"Ben"}'),
  (:C, '{"display_name":"Cem"}'), (:D, '{"display_name":"Dora"}');

select t.t_assert((select display_name from profiles where id = :A) = 'Anna', 'profile_trigger');

-- group_flow ---------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', :A, false);
select create_group('Kaarster Billiard Club') as gid \gset
select t.t_assert((select role from group_members where group_id = :'gid' and user_id = :A) = 'admin', 'group_flow: creator is admin');
select invite_code from groups where id = :'gid' \gset
select t.t_assert(length(:'invite_code') = 8, 'group_flow: invite code length 8');

select set_config('request.jwt.claim.sub', :B, false);
select join_by_code(lower(:'invite_code')) ->> 'kind' as kind \gset
select t.t_assert(:'kind' = 'group', 'group_flow: join kind');
select t.t_assert((select role from group_members where group_id = :'gid' and user_id = :B) = 'member', 'group_flow: B is member');

-- session_join_adds_membership --------------------------------------------
select set_config('request.jwt.claim.sub', :A, false);
select start_session(:'gid') as sid \gset
select code from sessions where id = :'sid' \gset
select t.t_assert(length(:'code') = 6, 'session code length 6');

select set_config('request.jwt.claim.sub', :C, false);
select t.t_assert((select count(*) from groups) = 0, 'C sees no group before joining');
select join_by_code(:'code') ->> 'kind' as kind \gset
select t.t_assert(:'kind' = 'session', 'session join kind');
select t.t_assert(exists (select 1 from group_members where group_id = :'gid' and user_id = :C), 'session_join_adds_membership: member');
select t.t_assert(exists (select 1 from session_players where session_id = :'sid' and user_id = :C), 'session_join_adds_membership: player');
select join_by_code(:'code') is not null as again \gset
select t.t_assert((select count(*) from session_players where session_id = :'sid' and user_id = :C) = 1, 'join is idempotent');

select set_config('request.jwt.claim.sub', :B, false);
select join_by_code(:'code') is not null as joined \gset

-- record_doubles_with_guest -----------------------------------------------
select set_config('request.jwt.claim.sub', :A, false);
select add_guest(:'sid', 'Tom') as guest \gset
select id as pa from session_players where session_id = :'sid' and user_id = :A \gset
select id as pb from session_players where session_id = :'sid' and user_id = :B \gset
select id as pc from session_players where session_id = :'sid' and user_id = :C \gset
select record_match(:'sid', array[:'pa', :'guest']::uuid[], array[:'pb', :'pc']::uuid[], 'A') as mid \gset
select t.t_assert((select count(*) from match_players where match_id = :'mid') = 4, 'doubles: 4 players');
select t.t_assert((select user_id from match_players where match_id = :'mid' and session_player_id = :'guest') is null, 'doubles: guest without user');
select t.t_assert((select group_id from matches where id = :'mid') = :'gid', 'match has group');

-- rejects_unequal_sides / rejects_player_from_other_session ----------------
select t.t_throws(format('select record_match(%L, array[%L,%L]::uuid[], array[%L]::uuid[], ''A'')', :'sid', :'pa', :'guest', :'pb'),
  'gleich groß', 'rejects_unequal_sides');
select t.t_throws(format('select record_match(%L, array[%L]::uuid[], array[%L]::uuid[], ''A'')', :'sid', :'pa', :'pa'),
  'doppelt', 'rejects same player on both sides');
select start_session(:'gid') as sid2 \gset
select id as pa2 from session_players where session_id = :'sid2' and user_id = :A \gset
select t.t_throws(format('select record_match(%L, array[%L]::uuid[], array[%L]::uuid[], ''A'')', :'sid', :'pa', :'pa2'),
  'nicht in dieser Sitzung', 'rejects_player_from_other_session');

-- update / delete ----------------------------------------------------------
select set_config('request.jwt.claim.sub', :B, false);
select update_match(:'mid', array[:'pa']::uuid[], array[:'pb']::uuid[], 'B');
select t.t_assert((select winner_side from matches where id = :'mid') = 'B', 'update_match winner');
select t.t_assert((select count(*) from match_players where match_id = :'mid') = 2, 'update_match players');
select record_match(:'sid', array[:'pa']::uuid[], array[:'pc']::uuid[], 'A') as mid2 \gset
select updated_at as before_delete from sessions where id = :'sid' \gset
select delete_match(:'mid2');
select t.t_assert((select updated_at from sessions where id = :'sid') > :'before_delete'::timestamptz, 'delete_match touches session for realtime');
select t.t_assert(not exists (select 1 from matches where id = :'mid2'), 'delete_match');

-- rls_isolation -------------------------------------------------------------
select set_config('request.jwt.claim.sub', :D, false);
select t.t_assert((select count(*) from groups) = 0, 'rls_isolation: groups');
select t.t_assert((select count(*) from matches) = 0, 'rls_isolation: matches');
select t.t_assert((select count(*) from sessions) = 0, 'rls_isolation: sessions');
select t.t_assert((select count(*) from session_players) = 0, 'rls_isolation: session_players');
select t.t_assert((select count(*) from profiles) = 1, 'rls_isolation: only own profile');
select t.t_throws(format('select record_match(%L, array[%L]::uuid[], array[%L]::uuid[], ''A'')', :'sid', :'pa', :'pb'),
  'Du bist kein', 'outsider cannot record');
select t.t_throws(format('insert into groups(name, invite_code) values (''x'', ''ABCDEFGH'')'), 'permission denied', 'no direct insert');

-- tournament_version_conflict ----------------------------------------------
select set_config('request.jwt.claim.sub', :A, false);
select create_tournament(:'sid', 1,
  jsonb_build_array(jsonb_build_array(:'pa'), jsonb_build_array(:'pb')),
  '[{"id":"r1-s0","round":1,"slot":0,"teamA":0,"teamB":1,"winner":null,"isBye":false,"matchId":null}]') as tid \gset
select t.t_throws(format('select create_tournament(%L, 1, %L, ''[]'')', :'sid',
  jsonb_build_array(jsonb_build_array(:'pa'), jsonb_build_array(:'pb'))), 'bereits ein Turnier', 'one running tournament');
select record_tournament_result(:'tid', 0,
  '[{"id":"r1-s0","round":1,"slot":0,"teamA":0,"teamB":1,"winner":1,"isBye":false,"matchId":null}]', 'r1-s0', true) as v \gset
select t.t_assert(:'v' = '1', 'version incremented');
select t.t_assert((select status from tournaments where id = :'tid') = 'finished', 'tournament finished');
select (bracket -> 0 ->> 'matchId')::uuid as tmid from tournaments where id = :'tid' \gset
select t.t_assert((select winner_side from matches where id = :'tmid') = 'B', 'tournament match recorded');
select t.t_assert((select count(*) from match_players where match_id = :'tmid' and side = 'B' and user_id = :B) = 1, 'tournament match players');
select t.t_throws(format('select record_tournament_result(%L, 0, %L, ''r1-s0'', true)', :'tid',
  '[{"id":"r1-s0","round":1,"slot":0,"teamA":0,"teamB":1,"winner":0,"isBye":false,"matchId":null}]'),
  'Stand hat sich geändert', 'tournament_version_conflict');
select t.t_throws(format('select update_match(%L, array[%L]::uuid[], array[%L]::uuid[], ''A'')', :'tmid', :'pa', :'pb'),
  'Turnierbaum', 'tournament matches not editable directly');

-- admin functions -----------------------------------------------------------
select set_config('request.jwt.claim.sub', :B, false);
select t.t_throws(format('select regenerate_invite(%L)', :'gid'), 'Admin', 'regenerate_invite admin only');
update groups set name = 'Hack' where id = :'gid';
select t.t_assert((select name from groups where id = :'gid') = 'Kaarster Billiard Club', 'member cannot rename group');
select set_config('request.jwt.claim.sub', :A, false);
select regenerate_invite(:'gid') as new_code \gset
select t.t_assert(:'new_code' <> :'invite_code', 'regenerate_invite changes code');
update groups set name = 'KBC' where id = :'gid';
select t.t_assert((select name from groups where id = :'gid') = 'KBC', 'admin renames group');
update groups set location = 'Spielhalle Kaarst' where id = :'gid';
select t.t_assert((select location from groups where id = :'gid') = 'Spielhalle Kaarst', 'admin sets location');
select t.t_throws(format('update groups set location = %L where id = %L', repeat('x', 61), :'gid'), 'check', 'location max 60');
select set_config('request.jwt.claim.sub', :B, false);
update groups set location = 'Hack' where id = :'gid';
select t.t_assert((select location from groups where id = :'gid') = 'Spielhalle Kaarst', 'member cannot set location');
select set_config('request.jwt.claim.sub', :A, false);
select remove_member(:'gid', :C);
select t.t_assert(not exists (select 1 from group_members where group_id = :'gid' and user_id = :C), 'remove_member');
select set_config('request.jwt.claim.sub', :C, false);
select t.t_throws(format('select record_match(%L, array[%L]::uuid[], array[%L]::uuid[], ''A'')', :'sid', :'pc', :'pb'),
  'kein Mitglied', 'removed member cannot record');
select set_config('request.jwt.claim.sub', :A, false);

-- internal helpers are not callable --------------------------------------
select set_config('request.jwt.claim.sub', :B, false);
select t.t_throws(format('select write_match_players(%L, array[%L]::uuid[], array[%L]::uuid[])', :'mid', :'pb', :'pa'),
  'permission denied', 'write_match_players not callable');
select t.t_throws('select gen_code(6)', 'permission denied', 'gen_code not callable');
select t.t_throws(format('select assert_session_writer(%L)', :'sid'), 'permission denied', 'assert_session_writer not callable');

-- ended_session_rejects_match ----------------------------------------------
select set_config('request.jwt.claim.sub', :B, false);
select t.t_throws(format('select end_session(%L)', :'sid'), 'Ersteller', 'end_session by non-creator non-admin');
select set_config('request.jwt.claim.sub', :A, false);
select end_session(:'sid');
select t.t_throws(format('select record_match(%L, array[%L]::uuid[], array[%L]::uuid[], ''A'')', :'sid', :'pa', :'pb'),
  'beendet', 'ended_session_rejects_match');
select t.t_throws(format('select join_by_code(%L)', :'code'), 'beendet', 'cannot join ended session');

reset role;
