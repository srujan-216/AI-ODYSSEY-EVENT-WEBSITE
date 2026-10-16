-- =============================================================================
-- Migration · 0007 — Track-dedicated pools
--
-- Each track is bound to one difficulty pool / mechanism:
--   junior ("Mystery Squad")  → EASY only  (case_number 1..5, spin wheel)
--   senior ("Mystery Masters") → HARD only (case_number 6..7, coin toss)
--
-- Changes vs 0006:
--   • Random-assignment path ignores any p_difficulty argument and derives
--     the pool from p_track. Participants never cross tracks.
--   • Admin / coordinator force-assign now rejects a case that doesn't
--     belong to the requested track's pool (e.g. H1 on junior).
--   • case_number CHECK remains 1..7; pool is enforced at write time by
--     assign_case() and client-side by the catalog.
--
-- Safe to re-run.
-- =============================================================================

drop function if exists public.assign_case(text, text, int);
drop function if exists public.assign_case(text, text, int, text);

create function public.assign_case(
  p_team_name   text,
  p_track       text,
  p_case_number int  default null,
  p_difficulty  text default null  -- kept for backwards compat; ignored
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
  -- Silence "unused parameter" warnings; p_difficulty is retained for RPC
  -- callers that still send it from older client builds.
  perform p_difficulty;

  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Team name must be 2-60 characters';
  end if;
  if p_track not in ('junior','senior') then
    raise exception 'track must be junior or senior';
  end if;
  if p_case_number is not null and (p_case_number < 1 or p_case_number > 7) then
    raise exception 'Requested case_number must be between 1 and 7';
  end if;

  -- Each track has one pool. Junior = 1..5 (easy); Senior = 6..7 (hard).
  if p_track = 'junior' then
    v_lo := 1; v_hi := 5; v_diff := 'easy';
  else
    v_lo := 6; v_hi := 7; v_diff := 'hard';
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

    -- Enforce the track → pool boundary even for admins.  Prevents
    -- accidentally handing an H-case to a junior team.
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
    -- Participant random path.  One active case at a time: block if any prior
    -- assignment on this track still has no recorded solved result.
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

-- Backfill: existing rows should already match the pools, but normalise just
-- in case a prior spin landed before migration 0006 ran.
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
