-- =============================================================================
-- Migration · 0006 — Split into 5 easy + 2 hard cases (case_number 1..7)
--
-- Case catalog:
--   1..5 easy  → labels e1..e5, assigned by spin wheel
--   6..7 hard  → labels h1..h2, assigned by coin toss
--
-- Changes:
--   1. Widen the CHECK constraint from 1..6 to 1..7 on team_assignments and
--      results.
--   2. Overload / replace assign_case() with a new signature that accepts an
--      optional p_difficulty filter. Participant random path draws only from
--      the chosen bucket.
--   3. One-active-case guard carried forward unchanged.
--   4. Backfill difficulty for any existing rows (shouldn't be any at this
--      point, but keeps the migration idempotent).
--
-- Safe to re-run.
-- =============================================================================

-- 1. Widen CHECK bounds 1..6 → 1..7
alter table public.team_assignments
  drop constraint if exists team_assignments_case_number_check;
alter table public.team_assignments
  add  constraint team_assignments_case_number_check
       check (case_number between 1 and 7);

alter table public.results
  drop constraint if exists results_case_number_check;
alter table public.results
  add  constraint results_case_number_check
       check (case_number between 1 and 7);

-- 2. Drop every pre-existing overload so there's no ambiguity.
drop function if exists public.assign_case(text, text, int);
drop function if exists public.assign_case(text, text, int, text);

create function public.assign_case(
  p_team_name   text,
  p_track       text,
  p_case_number int  default null,
  p_difficulty  text default null
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
  v_diff  text;
  v_open  int;
  v_lo    int;
  v_hi    int;
begin
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Team name must be 2-60 characters';
  end if;
  if p_track not in ('junior','senior') then
    raise exception 'track must be junior or senior';
  end if;
  if p_case_number is not null and (p_case_number < 1 or p_case_number > 7) then
    raise exception 'Requested case_number must be between 1 and 7';
  end if;
  if p_difficulty is not null and p_difficulty not in ('easy','hard') then
    raise exception 'p_difficulty must be easy, hard, or null';
  end if;

  perform pg_advisory_xact_lock(hashtext(lower(v_name) || ':' || p_track));

  if p_case_number is not null then
    -- Admin / coordinator path: specific case requested.
    if not (
      select exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'coordinator')
      )
    ) then
      raise exception 'Only event coordinators and administrators can assign a specific case number. Participants must spin the wheel or toss the coin.';
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
    -- Participant random path.  One active case at a time: block if ANY
    -- prior assignment on this track still has no recorded solved result.
    select count(*) into v_open
    from public.team_assignments a
    left join public.results r
      on r.team_name_lower = a.team_name_lower
     and r.track = a.track
     and r.case_number = a.case_number
    where a.team_name_lower = lower(v_name)
      and a.track = p_track
      and (r.id is null or r.is_solved is not true);

    if v_open > 0 then
      raise exception 'Team "%" already has an active case on the % track. Submit the report before dealing another.', v_name, p_track;
    end if;

    -- Narrow the candidate pool by difficulty, if provided.  Easy = 1..5,
    -- Hard = 6..7, both buckets fall back to 1..7 when null.
    if p_difficulty = 'easy' then
      v_lo := 1; v_hi := 5;
    elsif p_difficulty = 'hard' then
      v_lo := 6; v_hi := 7;
    else
      v_lo := 1; v_hi := 7;
    end if;

    select c into v_pick
    from (
      select generate_series(v_lo, v_hi) as c
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
      raise exception 'All % cases on the % track are already assigned to team "%"',
        case when p_difficulty is null then 7 else (v_hi - v_lo + 1) end,
        p_track,
        v_name;
    end if;
  end if;

  -- Difficulty is stamped from case_number — 1..5 easy, 6..7 hard.
  v_diff := case when v_pick between 6 and 7 then 'hard' else 'easy' end;

  insert into public.team_assignments (team_name, track, case_number, difficulty)
  values (v_name, p_track, v_pick, v_diff)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text, int, text) to anon, authenticated;

-- 3. Backfill difficulty on any rows that predate the split.
update public.team_assignments
   set difficulty = case when case_number between 6 and 7 then 'hard' else 'easy' end
 where difficulty is null
    or (case_number between 6 and 7 and difficulty <> 'hard')
    or (case_number between 1 and 5 and difficulty <> 'easy');

update public.results
   set difficulty = case when case_number between 6 and 7 then 'hard' else 'easy' end
 where difficulty is null
    or (case_number between 6 and 7 and difficulty <> 'hard')
    or (case_number between 1 and 5 and difficulty <> 'easy');
