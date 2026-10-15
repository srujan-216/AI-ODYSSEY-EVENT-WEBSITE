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
-- 2. team_assignments — case assignments per team per track
-- -----------------------------------------------------------------------------
create table if not exists public.team_assignments (
  id               uuid primary key default gen_random_uuid(),
  team_name        text not null check (char_length(team_name) between 2 and 60),
  team_name_lower  text generated always as (lower(team_name)) stored,
  track            text not null check (track in ('junior','senior')),
  case_number      int  not null check (case_number between 1 and 5),
  assigned_at      timestamptz not null default now()
);

-- One assignment per team per track per case (allows multiple cases per team, multiple teams per case).
create unique index if not exists team_assignments_team_track_case_uq
  on public.team_assignments (team_name_lower, track, case_number);

-- -----------------------------------------------------------------------------
-- 3. assign_case() — atomic case assignment RPC
-- Assigns a requested case or a random still-unassigned case (1..5) for this team.
-- Uses an advisory transaction lock on (team + track) to prevent race conditions.
-- -----------------------------------------------------------------------------
create or replace function public.assign_case(
  p_team_name   text,
  p_track       text,
  p_case_number int default null
)
returns public.team_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row   public.team_assignments;
  v_name  text := btrim(p_team_name);
  v_pick  int;
begin
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Team name must be 2-60 characters';
  end if;
  if p_track not in ('junior','senior') then
    raise exception 'track must be junior or senior';
  end if;
  if p_case_number is not null and (p_case_number < 1 or p_case_number > 5) then
    raise exception 'Requested case_number must be between 1 and 5';
  end if;

  -- Transaction-scoped advisory lock keyed to (team_name_lower + track)
  perform pg_advisory_xact_lock(hashtext(lower(v_name) || ':' || p_track));

  -- Path A: Specific case requested -> Restricted to coordinators and administrators
  if p_case_number is not null then
    if not (
      select exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'coordinator')
      )
    ) then
      raise exception 'Only event coordinators and administrators can assign a specific case number. Participants must request random assignment.';
    end if;

    select * into v_row
    from public.team_assignments
    where team_name_lower = lower(v_name)
      and track = p_track
      and case_number = p_case_number;
    if found then
      return v_row;
    end if;
    v_pick := p_case_number;
  else
    -- Path B: Random unassigned case for this team
    select c into v_pick
    from (
      select generate_series(1, 5) as c
    ) s
    where not exists (
      select 1 from public.team_assignments a
      where a.team_name_lower = lower(v_name)
        and a.track = p_track
        and a.case_number = s.c
    )
    order by random()
    limit 1;

    if v_pick is null then
      raise exception 'All 5 cases on the % track are already assigned to team "%"', p_track, v_name;
    end if;
  end if;

  insert into public.team_assignments (team_name, track, case_number)
  values (v_name, p_track, v_pick)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text, int) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. results — public competition results per team and case
-- -----------------------------------------------------------------------------
create table if not exists public.results (
  id              uuid primary key default gen_random_uuid(),
  team_name       text not null check (char_length(team_name) between 1 and 60),
  team_name_lower text generated always as (lower(team_name)) stored,
  track           text not null check (track in ('junior','senior')),
  case_number     int  not null check (case_number between 1 and 5),
  score           int  not null check (score >= 0 and score <= 100000),
  completion_time timestamptz,
  status          text check (status is null or char_length(status) <= 80),
  is_solved       boolean not null default false,
  is_demo         boolean not null default false,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One result record per team per track per case.
create unique index if not exists results_team_track_case_uq
  on public.results (team_name_lower, track, case_number);

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
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'results'
  ) then
    alter publication supabase_realtime add table public.results;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 6. Public leaderboard view (aggregates solved cases, ranks by cases_solved)
-- -----------------------------------------------------------------------------
drop view if exists public.leaderboard_public;
create view public.leaderboard_public as
  select
    min(r.id::text)::uuid as id,
    r.team_name,
    r.track,
    count(distinct r.case_number) filter (where r.is_solved = true)::int as cases_solved,
    coalesce(sum(r.score) filter (where r.is_solved = true), 0)::int as score,
    max(r.completion_time) filter (where r.is_solved = true) as completion_time,
    coalesce(
      string_agg(
        distinct 'Case ' || lpad(r.case_number::text, 2, '0'),
        ', ' order by 'Case ' || lpad(r.case_number::text, 2, '0')
      ) filter (where r.is_solved = true),
      'None cleared'
    ) as status,
    bool_or(r.is_demo) as is_demo,
    max(r.updated_at) as updated_at
  from public.results r
  group by r.team_name, r.team_name_lower, r.track
  order by
    cases_solved desc,
    score desc,
    completion_time asc nulls last,
    updated_at asc,
    team_name asc;

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

-- =============================================================================
-- Bootstrap note
-- -----------------------------------------------------------------------------
-- 1. Create the first admin user in Supabase Auth (dashboard -> Authentication
--    -> Users -> "Add user" with email + password). Confirm the email.
-- 2. In the SQL editor, promote them to admin:
--        update public.profiles set role = 'admin' where email = '<their email>';
-- 3. Thereafter they can sign in at /login.
-- =============================================================================
