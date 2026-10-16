-- =============================================================================
-- Migration · 0009 — Admins can delete team_assignments from the UI
--
-- team_assignments has had no DELETE policy, which was fine while every write
-- went through assign_case() (SECURITY DEFINER) and the only cleanup path was
-- the SQL editor. The Control Room now needs to delete stray / test spins
-- during the event without hopping to SQL, so this grants delete to anyone
-- flagged as admin or coordinator in public.profiles.
--
-- SELECT remains public (unchanged); INSERT / UPDATE stay denied so new rows
-- still have to go through assign_case().
--
-- Safe to re-run.
-- =============================================================================

drop policy if exists team_assignments_delete_admin on public.team_assignments;

create policy team_assignments_delete_admin on public.team_assignments
  for delete
  to authenticated
  using (public.is_investigator());
