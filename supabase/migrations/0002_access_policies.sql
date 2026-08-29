-- REIGN access policies.
--
-- Run this AFTER 0001_initial_schema.sql.
--
-- REIGN is a single-user app. There is one account, the owner's. The schema has
-- no user_id columns because there is no second user to distinguish from.
--
-- Two rules:
--
--   exercises is public-domain reference data from the Free Exercise DB. It
--   carries no personal information, so it is readable without signing in. It
--   is never writable from the app; the load below runs in the SQL editor,
--   which bypasses row level security.
--
--   Everything else — workouts, sets, splits, targets, cardio — is the owner's
--   training record and requires a signed-in account.
--
-- This is only safe while public sign-ups are turned off in the Supabase
-- dashboard, under Authentication, Sign In / Providers. With sign-ups off, the
-- only account that can exist is the one created by hand, so "signed in" and
-- "the owner" are the same thing. If sign-ups are ever turned back on, these
-- policies must be narrowed to a specific user id first.

-- ---------------------------------------------------------------------------
-- exercises — readable by anyone, writable by no one
-- ---------------------------------------------------------------------------
create policy "Exercise library is public reference data"
  on exercises for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Everything else — the owner's training record, signed in only
-- ---------------------------------------------------------------------------
create policy "Owner manages splits"
  on splits for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages workouts"
  on workouts for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages workout exercises"
  on workout_exercises for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages sets"
  on sets for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages exercise targets"
  on exercise_targets for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages cardio sessions"
  on cardio_sessions for all
  to authenticated
  using (true) with check (true);
