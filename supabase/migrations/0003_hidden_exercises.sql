-- REIGN: hidden exercises.
--
-- Run this AFTER 0002_access_policies.sql, and before deploying the version of
-- the app that reads it.
--
-- The exercise library holds 876 movements and browse already trims that to the
-- 462 a commercial gym has. No filter guessed in advance is going to be right
-- about everything, so the owner can hide anything they will never do. Personal
-- curation beats a rule, and it means the trim does not have to be perfect.
--
-- This is an eighth table added beside the seven. Nothing in the locked schema
-- changes: the seven tables and every column in them are untouched.
--
-- A hidden exercise is not deleted. Nothing is ever removed from the library,
-- and any hidden exercise can be brought back.

create table hidden_exercises (
  -- The exercise itself is the key: an exercise is either hidden or it is not,
  -- and it cannot be hidden twice.
  exercise_id  text primary key references exercises (id) on delete cascade,
  hidden_at    timestamptz not null default now()
);

alter table hidden_exercises enable row level security;

-- Same rule as the rest of the owner's data: signed in only. This is a
-- statement about the owner's preferences, not public reference data.
create policy "Owner manages hidden exercises"
  on hidden_exercises for all
  to authenticated
  using (true) with check (true);
