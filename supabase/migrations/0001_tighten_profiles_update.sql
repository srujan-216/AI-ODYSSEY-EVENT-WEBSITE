-- =============================================================================
-- Migration · 0001  —  Tighten profiles_self_update to prevent privilege
--                      escalation.
--
-- WHY
-- ---
-- The initial `profiles_self_update` policy only verified `auth.uid() = id`
-- in its WITH CHECK clause. That meant any signed-in user could run
--
--     UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
--
-- and the row would pass RLS, promoting them to admin. Because
-- `public.is_investigator()` (used by every write policy on `results`) reads
-- from `profiles.role`, this was a full privilege-escalation path.
--
-- WHAT THIS DOES
-- --------------
-- Replaces the policy with one that still lets a user update their OWN
-- profile row, but ONLY the `full_name` field. Any attempt to change `role`,
-- `email`, `id`, or `created_at` is rejected by the WITH CHECK clause, which
-- compares the proposed new row against the current one for every protected
-- column.
--
-- SAFE TO RE-RUN
-- --------------
-- Idempotent. Dropping + recreating the policy under the same name.
--
-- ROLLOUT
-- -------
-- 1. Open the Supabase SQL editor on your project.
-- 2. Paste this entire file and run it.
-- 3. Confirm with the diagnostic queries at the bottom.
-- =============================================================================

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

-- -----------------------------------------------------------------------------
-- Diagnostics — expected results
-- -----------------------------------------------------------------------------
--
-- 1. Policy exists and is bound to UPDATE:
--
--     SELECT polname, polcmd, pg_get_expr(polqual, polrelid)   AS using_clause,
--                               pg_get_expr(polwithcheck, polrelid) AS check_clause
--     FROM pg_policy
--     WHERE polrelid = 'public.profiles'::regclass
--       AND polname = 'profiles_self_update';
--
-- 2. As a non-admin signed-in user, this should FAIL with a check-violation:
--
--     UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
--
-- 3. As the same user, this should still SUCCEED:
--
--     UPDATE public.profiles SET full_name = 'My Display Name' WHERE id = auth.uid();
--
-- =============================================================================
