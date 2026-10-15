-- =============================================================================
-- Migration · 0003 — Loosen case_number bound from 5 to 6
-- Shared across both tracks (Junior and Senior point at the same case PDFs).
-- Safe to re-run (idempotent).
-- =============================================================================

-- 1. team_assignments.case_number  :  1..5  ->  1..6
alter table public.team_assignments
  drop constraint if exists team_assignments_case_number_check;

alter table public.team_assignments
  add  constraint team_assignments_case_number_check
       check (case_number between 1 and 6);

-- 2. results.case_number           :  1..5  ->  1..6
alter table public.results
  drop constraint if exists results_case_number_check;

alter table public.results
  add  constraint results_case_number_check
       check (case_number between 1 and 6);

-- 3. assign_case() — reissued with the new upper bound and matching messages.
--    Logic is otherwise identical to migration 0002.
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
  if p_case_number is not null and (p_case_number < 1 or p_case_number > 6) then
    raise exception 'Requested case_number must be between 1 and 6';
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

  insert into public.team_assignments (team_name, track, case_number)
  values (v_name, p_track, v_pick)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text, int) to anon, authenticated;
