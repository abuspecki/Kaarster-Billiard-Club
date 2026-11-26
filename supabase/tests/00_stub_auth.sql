-- Minimaler Ersatz für die Supabase-Umgebung, nur für lokale Tests.
create schema if not exists auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
create publication supabase_realtime;
