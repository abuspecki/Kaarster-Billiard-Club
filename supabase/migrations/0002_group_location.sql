-- Ort der Gruppe (z. B. „Spielhalle Kaarst“), vom Admin änderbar.
alter table public.groups
  add column location text check (location is null or char_length(trim(location)) between 1 and 60);

grant update (location) on public.groups to authenticated;
