-- =============================================================================
-- AI Odyssey x CodeHunt — database schema
-- Target: Supabase (PostgreSQL 15+ with pgcrypto, pg_graphql, pg_realtime).
-- Run this file once in the Supabase SQL editor on a fresh project.
--
-- Design summary
-- --------------
--   profiles          Mirrors auth.users; stores role (admin|coordinator).
--   team_assignments  One row per team per track; enforces one-case-per-team.
--   results           Public competition results; drives the leaderboard.
--
-- Clients talk to a public VIEW `leaderboard_public` instead of `results`
-- directly, so the anon key can SELECT it (safe columns only) while writes
-- stay locked behind RLS.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. profiles — role store, mirrors auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'coordinator'
              check (role in ('admin','coordinator')),
  full_name  text,
  created_at timestamptz not null default now()
);

-- Keep profile.email in sync when a user is created in auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. team_assignments — one case per team per track, enforced in DB
-- -----------------------------------------------------------------------------
create table if not exists public.team_assignments (
  id               uuid primary key default gen_random_uuid(),
  team_name        text not null check (char_length(team_name) between 2 and 60),
  team_name_lower  text generated always as (lower(team_name)) stored,
  track            text not null check (track in ('junior','senior')),
  case_number      int  not null check (case_number between 1 and 10),
  assigned_at      timestamptz not null default now()
);

-- One assignment per team per track.
create unique index if not exists team_assignments_team_track_uq
  on public.team_assignments (team_name_lower, track);

-- One assignment per case per track (so two teams never collide on a case).
create unique index if not exists team_assignments_track_case_uq
  on public.team_assignments (track, case_number);

-- -----------------------------------------------------------------------------
-- 3. assign_case() — atomic case assignment RPC
-- Picks a random still-available case for the (team, track) tuple. If the team
-- already has an assignment on this track, returns the existing row (idempotent).
-- -----------------------------------------------------------------------------
create or replace function public.assign_case(
  p_team_name text,
  p_track     text
)
returns public.team_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_pick  int;
  v_row   public.team_assignments;
  v_name  text := btrim(p_team_name);
begin
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Team name must be 2-60 characters';
  end if;
  if p_track not in ('junior','senior') then
    raise exception 'track must be junior or senior';
  end if;

  -- Return existing assignment if present (one case per team per track).
  select * into v_row
  from public.team_assignments
  where team_name_lower = lower(v_name) and track = p_track;
  if found then
    return v_row;
  end if;

  -- Both divisions carry 5 case files.
  v_total := 5;

  -- Lock the table slice for this track to prevent two concurrent assignments
  -- from grabbing the same remaining case.
  perform 1 from public.team_assignments where track = p_track for update;

  -- Pick a random available case number for this track.
  select case_number into v_pick
  from (
    select generate_series(1, v_total) as case_number
  ) all_cases
  where not exists (
    select 1 from public.team_assignments a
    where a.track = p_track and a.case_number = all_cases.case_number
  )
  order by random()
  limit 1;

  if v_pick is null then
    raise exception 'No cases remaining on the % track', p_track;
  end if;

  insert into public.team_assignments (team_name, track, case_number)
  values (v_name, p_track, v_pick)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. results — public leaderboard rows
-- -----------------------------------------------------------------------------
create table if not exists public.results (
  id              uuid primary key default gen_random_uuid(),
  team_name       text not null check (char_length(team_name) between 1 and 60),
  team_name_lower text generated always as (lower(team_name)) stored,
  track           text not null check (track in ('junior','senior')),
  score           int  not null check (score >= 0 and score <= 100000),
  completion_time timestamptz,
  status          text check (status is null or char_length(status) <= 80),
  is_demo         boolean not null default false,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One result per team per track (upsert key).
create unique index if not exists results_team_track_uq
  on public.results (team_name_lower, track);

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists results_touch on public.results;
create trigger results_touch
  before update on public.results
  for each row execute function public.touch_updated_at();

drop trigger if exists results_touch_insert on public.results;
create trigger results_touch_insert
  before insert on public.results
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Realtime: enable change streams on results
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.results;

-- -----------------------------------------------------------------------------
-- 6. Public leaderboard view (safe columns only, sorted deterministically)
-- -----------------------------------------------------------------------------
drop view if exists public.leaderboard_public;
create view public.leaderboard_public as
  select
    id,
    team_name,
    track,
    score,
    completion_time,
    status,
    is_demo,
    updated_at
  from public.results;

grant select on public.leaderboard_public to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Row-Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.team_assignments  enable row level security;
alter table public.results           enable row level security;

-- profiles: a user sees only their own row. Service role bypasses RLS.
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = id);

-- profiles_self_update: a user may ONLY update their own `full_name`. The
-- WITH CHECK clause pins every other column to its current value, so the
-- policy cannot be used to elevate role, swap email or forge created_at.
-- See supabase/migrations/0001_tighten_profiles_update.sql for the audit.
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    AND role       IS NOT DISTINCT FROM (SELECT p.role       FROM public.profiles p WHERE p.id = auth.uid())
    AND email      IS NOT DISTINCT FROM (SELECT p.email      FROM public.profiles p WHERE p.id = auth.uid())
    AND created_at IS NOT DISTINCT FROM (SELECT p.created_at FROM public.profiles p WHERE p.id = auth.uid())
  );

-- team_assignments: writes are only via RPC (SECURITY DEFINER). Direct
-- INSERT/UPDATE/DELETE from anon or authenticated is denied by not creating
-- any policy. SELECT is allowed so the dashboard can look up its own row.
drop policy if exists team_assignments_select_all on public.team_assignments;
create policy team_assignments_select_all on public.team_assignments
  for select using (true);

-- results:
--   • SELECT: public (so leaderboard works).
--   • INSERT/UPDATE/DELETE: only admins or coordinators (via profiles.role).
drop policy if exists results_select_public on public.results;
create policy results_select_public on public.results
  for select using (true);

create or replace function public.is_investigator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin','coordinator')
  );
$$;

grant execute on function public.is_investigator() to authenticated;

drop policy if exists results_insert_admin on public.results;
create policy results_insert_admin on public.results
  for insert to authenticated with check (public.is_investigator());

drop policy if exists results_update_admin on public.results;
create policy results_update_admin on public.results
  for update to authenticated using (public.is_investigator())
  with check (public.is_investigator());

drop policy if exists results_delete_admin on public.results;
create policy results_delete_admin on public.results
  for delete to authenticated using (public.is_investigator());

-- -----------------------------------------------------------------------------
-- 8. Demo seed (clearly flagged with is_demo = true). Safe to re-run.
-- -----------------------------------------------------------------------------
insert into public.results (team_name, track, score, status, is_demo)
values
  ('DEMO · Null Pointer', 'senior', 480, 'Case 04 cleared', true),
  ('DEMO · GhostProtocol', 'senior', 455, 'Case 02 cleared', true),
  ('DEMO · Sentinel',     'junior', 430, 'Case 05 cleared', true),
  ('DEMO · Watchdogs',    'junior', 410, 'In progress',     true),
  ('DEMO · Zero Cool',    'senior', 395, 'In progress',     true)
on conflict (team_name_lower, track) do nothing;

-- =============================================================================
-- Bootstrap note
-- -----------------------------------------------------------------------------
-- 1. Create the first admin user in Supabase Auth (dashboard -> Authentication
--    -> Users -> "Add user" with email + password). Confirm the email.
-- 2. In the SQL editor, promote them to admin:
--        update public.profiles set role = 'admin' where email = '<their email>';
-- 3. Thereafter they can sign in at /login.
-- =============================================================================
