-- =============================================================================
-- Migration · 0010 — Rank leaderboard by elapsed time taken
--
-- Before: ties on cases_solved + score were broken by the wall-clock
-- submission timestamp (completion_time), so a team that spun late and
-- finished quickly ranked BELOW a team that spun early and took forever.
--
-- After: time_taken_seconds = SUM across solved cases of
-- (completion_time − assigned_at). The team that spent the least time
-- actually solving wins the tiebreak, which matches the rubric the user
-- announced to participants: "ranked by time taken".
--
-- Also exposes time_taken_seconds as a leaderboard column so the podium
-- can render "1h 23m" next to each team instead of a wall-clock stamp.
--
-- Teams with no team_assignments row (manual CSV import, bulk edit) have
-- a NULL elapsed and sort to the bottom of their (cases, score) group.
--
-- Safe to re-run.
-- =============================================================================

drop view if exists public.leaderboard_public;

create view public.leaderboard_public as
  with per_case as (
    select
      r.id,
      r.team_name,
      r.team_name_lower,
      r.track,
      r.case_number,
      r.is_solved,
      r.is_demo,
      r.score,
      r.completion_time,
      r.updated_at,
      a.assigned_at,
      case
        when r.is_solved
         and r.completion_time is not null
         and a.assigned_at is not null
          then greatest(
            extract(epoch from (r.completion_time - a.assigned_at))::int,
            0
          )
        else null
      end as case_elapsed_seconds
    from public.results r
    left join public.team_assignments a
      on  a.team_name_lower = r.team_name_lower
      and a.track            = r.track
      and a.case_number      = r.case_number
  )
  select
    min(p.id::text)::uuid                                                 as id,
    p.team_name,
    p.track,
    count(distinct p.case_number) filter (where p.is_solved = true)::int  as cases_solved,
    coalesce(sum(p.score) filter (where p.is_solved = true), 0)::int      as score,
    max(p.completion_time)        filter (where p.is_solved = true)       as completion_time,
    -- SUM across solved cases. NULL when no solved case has a usable
    -- assigned_at pair (so manual-only rows sort last, not top).
    (
      case
        when count(*) filter (
          where p.is_solved = true and p.case_elapsed_seconds is not null
        ) = 0 then null
        else sum(p.case_elapsed_seconds) filter (where p.is_solved = true)::int
      end
    )                                                                     as time_taken_seconds,
    coalesce(
      string_agg(
        distinct 'Case ' || lpad(p.case_number::text, 2, '0'),
        ', ' order by 'Case ' || lpad(p.case_number::text, 2, '0')
      ) filter (where p.is_solved = true),
      'None cleared'
    )                                                                     as status,
    bool_or(p.is_demo)                                                    as is_demo,
    max(p.updated_at)                                                     as updated_at
  from per_case p
  group by p.team_name, p.team_name_lower, p.track
  order by
    cases_solved        desc,
    score               desc,
    time_taken_seconds  asc nulls last,
    updated_at          asc,
    team_name           asc;

grant select on public.leaderboard_public to anon, authenticated;
