-- REIGN: programs.
--
-- Run this AFTER 0003_hidden_exercises.sql, and before deploying the version of
-- the app that reads it.
--
-- The weekday split answers "what do I train on a Monday". A program answers
-- something else: a named plan with its own days, each holding chosen exercises
-- with a prescribed number of sets and a rep range. Following one is optional
-- and always has been; the split keeps working with no program at all.
--
-- Three tables added beside the eight. Nothing existing changes: not one column
-- of the seven locked tables, and not hidden_exercises either.
--
-- NO PROGRAM IS SHIPPED. There is no seed data here and there never will be.
-- The repository holds the structure; the owner's database holds their own copy
-- of what they follow, entered through the exercise picker like anything else.
-- Shipping a published program's contents as application data would be someone
-- else's material redistributed, so this is a constraint rather than a
-- preference.
--
-- Because a program's exercises are chosen from REIGN's own library, the stored
-- reference is an ordinary exercises.id and there is no name-mapping table to
-- build or maintain.

-- ---------------------------------------------------------------------------
-- programs — a named plan the owner has entered
-- ---------------------------------------------------------------------------
create table programs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  -- Whether this is the program currently being followed. At most one is, and
  -- none has to be: with no active program Today reads the weekday split, which
  -- is what it has always done.
  is_active  boolean not null default false
);

-- At most one active program. A partial unique index allows any number of
-- inactive rows while permitting exactly one true, which a plain unique
-- constraint could not express.
create unique index programs_one_active_idx
  on programs (is_active)
  where is_active;

-- ---------------------------------------------------------------------------
-- program_days — the days a program is made of
-- ---------------------------------------------------------------------------
create table program_days (
  id              uuid primary key default gen_random_uuid(),
  program_id      uuid not null references programs (id) on delete cascade,

  -- What the day is called: Push, Pull, Upper. This is what Today shows and
  -- what workouts.split_name copies, so history survives the program changing.
  name            text not null,

  -- The muscles it covers. Same shape as splits.target_muscles, because a
  -- program day is the same kind of statement: a push day is chest, shoulders
  -- and triceps, which is three regions rather than one.
  target_muscles  text[] not null default '{}',

  -- The weekday it is assigned to, which may be empty. A program day exists
  -- whether or not it has been placed in the week, so this is nullable rather
  -- than a placeholder value.
  day_of_week     smallint check (day_of_week between 0 and 6),

  -- The order the days are read in. This is storage order for the list, and is
  -- NEVER shown as a number. "Day 1" is the program day counter CLAUDE.md
  -- forbids and that the specification's "Week 6 - Day 4" was corrected for:
  -- the weekday already separates Monday's Push from Thursday's Push, so a
  -- number carries nothing but the feeling of being on a schedule.
  position        integer not null check (position >= 0),

  unique (program_id, position)
);

-- One day per weekday within a program. Two days both claiming Monday would
-- leave Today with no answer to give. Partial, because any number of days may
-- be unassigned.
create unique index program_days_one_per_weekday_idx
  on program_days (program_id, day_of_week)
  where day_of_week is not null;

create index program_days_program_id_idx on program_days (program_id);

-- ---------------------------------------------------------------------------
-- program_exercises — what a program day prescribes
-- ---------------------------------------------------------------------------
create table program_exercises (
  id              uuid primary key default gen_random_uuid(),
  program_day_id  uuid not null references program_days (id) on delete cascade,
  exercise_id     text not null references exercises (id),
  position        integer not null check (position >= 0),

  -- How many sets the program asks for. Named set_count rather than sets: the
  -- sets table holds sets that were actually performed, and using one word for
  -- both a prescription and a record would be the terminology mistake
  -- CLAUDE.md warns about.
  set_count       integer not null check (set_count >= 1),

  -- The rep range, in the same columns and with the same checks as
  -- exercise_targets, because this SEEDS that table rather than competing with
  -- it. A program day's range fills in exercise_targets the first time the
  -- exercise is used, and after that the per-exercise row is the truth. Double
  -- progression then reads one place, which is what stops a row meaning
  -- different things depending on which day wrote it.
  target_rep_min  integer not null check (target_rep_min >= 1),
  target_rep_max  integer not null check (target_rep_max >= 1),

  unique (program_day_id, position),
  check (target_rep_max >= target_rep_min)
);

create index program_exercises_day_id_idx on program_exercises (program_day_id);
create index program_exercises_exercise_id_idx on program_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- Access. Same rule as the rest of the owner's data: signed in only.
--
-- A program is what the owner has decided to follow. It is their record, not
-- public reference data, so it does not get the exercises table's open read.
-- ---------------------------------------------------------------------------
alter table programs enable row level security;
alter table program_days enable row level security;
alter table program_exercises enable row level security;

create policy "Owner manages programs"
  on programs for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages program days"
  on program_days for all
  to authenticated
  using (true) with check (true);

create policy "Owner manages program exercises"
  on program_exercises for all
  to authenticated
  using (true) with check (true);
