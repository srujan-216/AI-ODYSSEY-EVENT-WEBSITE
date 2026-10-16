-- =============================================================================
-- Migration · 0008 — Add E6 to the easy pool
--
-- Catalog becomes:
--   case_number 1..6  → labels E1..E6 (easy)  — junior / Mystery Squad
--   case_number 7..8  → labels H1..H2 (hard)  — senior / Mystery Masters
--
-- IMPORTANT ONE-TIME NOTE: before this migration, case_number 6 meant H1
-- (hard) and 7 meant H2 (hard). This migration re-maps the hard pool to
-- 7..8. Any pre-existing rows at case_number = 6 (which could only have
-- been senior/hard under the old scheme) are migrated up to 7 so the
-- H1 identity is preserved; case_number = 7 (old H2) moves up to 8.
-- If no event rows exist yet (expected for pre-launch) this is a no-op.
--
-- Safe to re-run.
-- =============================================================================

-- 1. Shift historical hard rows up by one (6 -> 7, 7 -> 8) BEFORE loosening
--    the CHECK, so the new rows still satisfy the old 1..7 constraint while
--    we're mid-migration. Only touches senior rows (the only place the old
--    6/7 could have come from); junior rows were constrained to 1..5 under
--    migration 0007 so they can never collide.
update public.results
   set case_number = case when case_number = 6 then 7 when case_number = 7 then 8 end
 where track = 'senior'
   and case_number in (6, 7);

update public.team_assignments
   set case_number = case when case_number = 6 then 7 when case_number = 7 then 8 end
 where track = 'senior'
   and case_number in (6, 7);

-- 2. Widen the CHECK constraints 1..7 → 1..8.
alter table public.team_assignments
  drop constraint if exists team_assignments_case_number_check;
alter table public.team_assignments
  add  constraint team_assignments_case_number_check
       check (case_number between 1 and 8);

alter table public.results
  drop constraint if exists results_case_number_check;
alter table public.results
  add  constraint results_case_number_check
       check (case_number between 1 and 8);

-- 3. Reissue assign_case() with the new ranges.
drop function if exists public.assign_case(text, text, int);
drop function if exists public.assign_case(text, text, int, text);

create function public.assign_case(
  p_team_name   text,
  p_track       text,
  p_case_number int  default null,
  p_difficulty  text default null  -- retained for RPC backwards compat; ignored
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
  perform p_difficulty;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Team name must be 2-60 characters';
  end if;
  if p_track not in ('junior','senior') then
    raise exception 'track must be junior or senior';
  end if;
  if p_case_number is not null and (p_case_number < 1 or p_case_number > 8) then
    raise exception 'Requested case_number must be between 1 and 8';
  end if;

  -- Junior = 1..6 (easy, E1..E6); Senior = 7..8 (hard, H1..H2).
  if p_track = 'junior' then
    v_lo := 1; v_hi := 6; v_diff := 'easy';
  else
    v_lo := 7; v_hi := 8; v_diff := 'hard';
  end if;

  perform pg_advisory_xact_lock(hashtext(lower(v_name) || ':' || p_track));

  if p_case_number is not null then
    if not (
      select exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.role in ('admin', 'coordinator')
      )
    ) then
      raise exception 'Only event coordinators and administrators can assign a specific case number. Participants must spin the wheel or toss the coin.';
    end if;

    if p_case_number < v_lo or p_case_number > v_hi then
      raise exception 'Case % is not in the % track''s pool (allowed range: %..%)',
        p_case_number, p_track, v_lo, v_hi;
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
        (v_hi - v_lo + 1), p_track, v_name;
    end if;
  end if;

  insert into public.team_assignments (team_name, track, case_number, difficulty)
  values (v_name, p_track, v_pick, v_diff)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text, int, text) to anon, authenticated;

-- 4. Normalise difficulty on any row that still carries the old boundary.
update public.team_assignments
   set difficulty = case when case_number between 7 and 8 then 'hard' else 'easy' end
 where difficulty is null
    or (case_number between 7 and 8 and difficulty <> 'hard')
    or (case_number between 1 and 6 and difficulty <> 'easy');

update public.results
   set difficulty = case when case_number between 7 and 8 then 'hard' else 'easy' end
 where difficulty is null
    or (case_number between 7 and 8 and difficulty <> 'hard')
    or (case_number between 1 and 6 and difficulty <> 'easy');
