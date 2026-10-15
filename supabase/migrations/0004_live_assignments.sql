-- =============================================================================
-- Migration · 0004 — Live assignments feed + case difficulty
--
-- 1. Add team_assignments to the supabase_realtime publication so the admin
--    "Investigation Control Room" sees new spins land the moment they happen.
-- 2. Add a nullable difficulty column on team_assignments (snapshotted at
--    assignment time) so the control room can colour-code cases without
--    having to carry a separate catalog.
-- 3. assign_case() stamps the difficulty from a static map (1..4 easy,
--    5..6 hard).  Mirrors src/lib/cases.ts; keep in sync if the split moves.
-- 4. Backfill difficulty on existing rows.
-- Safe to re-run.
-- =============================================================================

-- 1. Realtime stream on team_assignments
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'team_assignments'
  ) then
    alter publication supabase_realtime add table public.team_assignments;
  end if;
end;
$$;

-- 2. Difficulty column (nullable so existing rows survive)
alter table public.team_assignments
  add column if not exists difficulty text
    check (difficulty is null or difficulty in ('easy','hard'));

-- Same column on results so the leaderboard can weight hard cases if needed.
alter table public.results
  add column if not exists difficulty text
    check (difficulty is null or difficulty in ('easy','hard'));

-- 3. assign_case() — now stamps difficulty from the shared catalog.
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

  -- Shared catalog: 1..4 easy, 5..6 hard. Mirrors src/lib/cases.ts.
  v_diff := case when v_pick between 5 and 6 then 'hard' else 'easy' end;

  insert into public.team_assignments (team_name, track, case_number, difficulty)
  values (v_name, p_track, v_pick, v_diff)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.assign_case(text, text, int) to anon, authenticated;

-- 4. Backfill existing rows that predate the column.
update public.team_assignments
   set difficulty = case when case_number between 5 and 6 then 'hard' else 'easy' end
 where difficulty is null;

update public.results
   set difficulty = case when case_number between 5 and 6 then 'hard' else 'easy' end
 where difficulty is null;
