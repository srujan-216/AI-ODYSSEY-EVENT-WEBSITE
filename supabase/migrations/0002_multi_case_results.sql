-- =============================================================================
-- Migration · 0002 — Support Multi-Case Results, Safe Assignment & Solved Ranking
-- Safe to re-run (Idempotent). Zero arbitrary backfill.
-- =============================================================================

-- 1. Modify results table: add case_number (1..5) and is_solved flag (default false)
alter table public.results
  add column if not exists case_number int check (case_number between 1 and 5),
  add column if not exists is_solved boolean not null default false;

-- 2. Evidence-Based Backfill: ONLY map rows with unambiguous evidence

-- Pre-backfill Guard 1: Detect conflicting evidence between team_assignments and status text
do $$
declare
  v_conflict_count int;
begin
  select count(*) into v_conflict_count
  from public.results r
  join (
    select team_name_lower, track, min(case_number) as assigned_case
    from public.team_assignments
    group by team_name_lower, track
    having count(*) = 1
  ) a on r.team_name_lower = a.team_name_lower and r.track = a.track
  where (substring(r.status from '(?i)\bcase\s*0*([1-5])\b'))::int is not null
    and a.assigned_case <> (substring(r.status from '(?i)\bcase\s*0*([1-5])\b'))::int;

  if v_conflict_count > 0 then
    raise exception 'Migration aborted: % row(s) in public.results have conflicting evidence between team_assignments and status text. Manual resolution required before migration.', v_conflict_count;
  end if;
end;
$$;

-- Pre-backfill Guard 2: Detect duplicate legacy records for the same team and track
do $$
declare
  v_dup_count int;
begin
  select count(*) into v_dup_count
  from (
    select team_name_lower, track
    from public.results
    group by team_name_lower, track
    having count(*) > 1
  ) d;

  if v_dup_count > 0 then
    raise exception 'Migration aborted: % duplicate team/track group(s) exist in public.results. Resolve legacy duplicates before applying multi-case migration.', v_dup_count;
  end if;
end;
$$;

-- Priority 1: Match case_number from team_assignments IF the team has exactly 1 assignment on that track
update public.results r
set case_number = a.case_number
from (
  select team_name_lower, track, min(case_number) as case_number
  from public.team_assignments
  group by team_name_lower, track
  having count(*) = 1
) a
where r.case_number is null
  and r.team_name_lower = a.team_name_lower
  and r.track = a.track;

-- Priority 2: Extract case number from status text IF explicitly formatted (e.g. 'Case 03 cleared', 'Case 2')
update public.results
set case_number = (substring(status from '(?i)\bcase\s*0*([1-5])\b'))::int
where case_number is null
  and substring(status from '(?i)\bcase\s*0*([1-5])\b') is not null;

-- Strict Post-Backfill Guard: If ANY rows still lack a case_number, abort transaction immediately.
-- Never guess or assign arbitrary case numbers.
do $$
declare
  v_unmapped_count int;
begin
  select count(*) into v_unmapped_count
  from public.results
  where case_number is null;

  if v_unmapped_count > 0 then
    raise exception 'Migration aborted: % row(s) in public.results lack reliable case_number evidence. Please run the preflight query and provide explicit mappings before proceeding.', v_unmapped_count;
  end if;
end;
$$;

-- Strict Post-Backfill Guard: Verify uniqueness before index creation to prevent transaction rollback surprises
do $$
declare
  v_dup_case_count int;
begin
  select count(*) into v_dup_case_count
  from (
    select team_name_lower, track, case_number
    from public.results
    group by team_name_lower, track, case_number
    having count(*) > 1
  ) d;

  if v_dup_case_count > 0 then
    raise exception 'Migration aborted: % duplicate (team, track, case_number) combination(s) detected after backfill. Cannot create unique index.', v_dup_case_count;
  end if;
end;
$$;

-- Enforce NOT NULL constraint once all rows have verified case numbers
alter table public.results alter column case_number set not null;

-- 3. Replace unique index on results: one result per team per track per case
-- Safe constraint/index drops handle both constraint-backed and standalone indexes
alter table public.results drop constraint if exists results_team_track_uq;
drop index if exists public.results_team_track_uq;
create unique index if not exists results_team_track_case_uq
  on public.results (team_name_lower, track, case_number);

-- 4. Relax team_assignments: allow multiple cases per team and shared cases across teams
alter table public.team_assignments drop constraint if exists team_assignments_track_case_uq;
drop index if exists public.team_assignments_track_case_uq;
alter table public.team_assignments drop constraint if exists team_assignments_team_track_uq;
drop index if exists public.team_assignments_team_track_uq;
create unique index if not exists team_assignments_team_track_case_uq
  on public.team_assignments (team_name_lower, track, case_number);

-- 5. Redesign assign_case RPC:
--    - Enforces least privilege: only coordinators/admins can request a specific case number.
--    - Anonymous callers can only request random unassigned cases.
--    - Transaction-scoped advisory lock prevents concurrent race conditions.
--    - Prevents duplicate assignments for the same team + track + case.
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

-- 6. Public Leaderboard View:
--    - Ranks strictly by distinct solved cases (is_solved = true)
--    - Tie-breaks by total score of solved cases, then completion time
--    - Atomic DROP/CREATE/GRANT ensures dependent clients never see broken permissions
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
