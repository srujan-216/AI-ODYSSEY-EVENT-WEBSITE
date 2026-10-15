-- =============================================================================
-- Migration · 0005 — One active case per team at a time
--
-- Participant flow (p_case_number is null): assign_case() now refuses a new
-- spin while the team still has a case whose report has not been recorded
-- (either no results row, or results.is_solved is not true). Admins and
-- coordinators force-assigning a specific case (p_case_number set) are
-- unaffected, so coordinators can still override from the Control Room.
-- Safe to re-run.
-- =============================================================================

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
  v_diff  text;
  v_open  int;
begin
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Team name must be 2-60 characters';
  end if;
  if p_track not in ('junior','senior') then
    raise exception 'track must be junior or senior';
  end if;
  if p_case_number is not null and (p_case_number < 1 or p_case_number > 6) then
    raise exception 'Requested case_number must be between 1 and 6';
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
    -- Participant random path: block if ANY prior assignment on this track
    -- is still open (no results row, or is_solved is not true). One case
    -- at a time — team hands in the report before spinning for another.
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
      raise exception 'Team "%" already has an active case on the % track. Submit the report before spinning again.', v_name, p_track;
    end if;

    select c into v_pick
    from (
      select generate_series(1, 6) as c
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
      raise exception 'All 6 cases on the % track are already assigned to team "%"', p_track, v_name;
    end if;
  end if;

  -- Shared catalog: 1..4 easy, 5..6 hard. Mirrors src/lib/cases.ts.
  v_diff := case when v_pick between 5 and 6 then 'hard' else 'easy' end;

  insert into public.team_assignments (team_name, track, case_number, difficulty)
  values (v_name, p_track, v_pick, v_diff)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text, int) to anon, authenticated;
