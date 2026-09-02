-- REIGN: programs that can describe more than a lifting day.
--
-- Run this AFTER 0005_alternatives.sql.
--
-- 0004 gave a program days, and each day a list of exercises with a set count
-- and a rep range. That describes Bigger Leaner Stronger exactly, because every
-- BLS day is the same shape: pick up a barbell, do sets of it.
--
-- It cannot describe a plan built around four kinds of training rather than
-- one. A zone 2 day has no exercises and no reps; it has a machine and a length
-- of time. A VO2 max day has an interval structure. A day may begin with a
-- stability block that is not sets at all. A carry is measured in seconds, and
-- per side. A dead hang has no target rep count because the target is failure.
--
-- Nothing here is removed or renamed. Every column 0004 created still means
-- what it meant, and every existing row keeps working: the two columns that
-- change do so by ALLOWING a null they previously refused, which no stored row
-- can notice. A program entered under 0004 reads identically under 0006 —
-- kind defaults to strength, which is what those days already were.

-- ---------------------------------------------------------------------------
-- programs — what the plan is, beyond its name
-- ---------------------------------------------------------------------------

-- A sentence about what the program is for. The Program tab currently shows a
-- name and a count of days, which distinguishes two programs by size and
-- nothing else.
alter table programs add column if not exists description text;

-- Standing notes that belong to the whole plan rather than to any one day:
-- what is deliberately excluded, what to test occasionally. These are the
-- things that get forgotten and then quietly undone six weeks later, which is
-- the argument for storing them where the program is read.
--
-- An array rather than one blob of text, because they are a list and rendering
-- them as a list should not mean splitting a string on newlines at read time.
alter table programs add column if not exists notes text[] not null default '{}';

-- No day count column. It is count(program_days), and a stored copy is a number
-- that can disagree with the days it claims to count. CLAUDE.md's rule about
-- never storing assembled display values is the same argument.

-- ---------------------------------------------------------------------------
-- program_days — what KIND of training a day is
-- ---------------------------------------------------------------------------

-- The four kinds this plan is built from. Everything 0004 could describe was
-- strength, so that is the default and every existing day is already correct.
--
-- 'rest' is a kind rather than the absence of a day, because a rest day is a
-- deliberate part of a week and a program that simply omits Sunday cannot say
-- whether Sunday is rest or an oversight.
alter table program_days add column if not exists kind text not null default 'strength';

alter table program_days drop constraint if exists program_days_kind_check;
alter table program_days add constraint program_days_kind_check
  check (kind in ('strength', 'zone2', 'vo2max', 'rest'));

-- What the day itself needs said. Not the exercise notes below: this is the
-- instruction that governs the whole session, like what "hard" is supposed to
-- mean on an interval day.
alter table program_days add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- program_exercises — prescriptions that are not always sets of reps
-- ---------------------------------------------------------------------------

-- How long to rest after each set. 0004 had nowhere to put this because the
-- owner's plan did not prescribe rest; this one does, and the difference
-- between 90 seconds and 180 seconds is the difference between two programs.
--
-- Nullable, because "not prescribed" is a real answer and zero is not the way
-- to say it.
alter table program_exercises add column if not exists rest_seconds integer;
alter table program_exercises drop constraint if exists program_exercises_rest_check;
alter table program_exercises add constraint program_exercises_rest_check
  check (rest_seconds is null or rest_seconds > 0);

-- What this exercise in particular needs said: a tempo, an accepted
-- substitution, which set to slow down.
alter table program_exercises add column if not exists notes text;

-- Reps or seconds. A carry and a dead hang are prescribed in time, and storing
-- "45" in a column called target_rep_min while meaning seconds would be a
-- number that lies about itself.
alter table program_exercises add column if not exists unit text not null default 'reps';
alter table program_exercises drop constraint if exists program_exercises_unit_check;
alter table program_exercises add constraint program_exercises_unit_check
  check (unit in ('reps', 'seconds'));

-- Whether the prescription is per side. "3 sets of 8" and "3 sets of 8 per
-- side" are different amounts of work, and the difference cannot be recovered
-- from the numbers.
alter table program_exercises
  add column if not exists per_side boolean not null default false;

-- Some prescriptions have no target: the target is failure. This is not the
-- same as an unknown range, so it is a stated fact rather than an absence.
alter table program_exercises
  add column if not exists to_failure boolean not null default false;

-- Which means the range must be allowed to be absent. This is the only change
-- to an existing column in this migration, and it only widens what is
-- permitted: every row already stored satisfies it.
alter table program_exercises alter column target_rep_min drop not null;
alter table program_exercises alter column target_rep_max drop not null;

-- Both or neither. Half a range is a loading mistake.
alter table program_exercises drop constraint if exists program_exercises_range_paired;
alter table program_exercises add constraint program_exercises_range_paired
  check ((target_rep_min is null) = (target_rep_max is null));

-- And something must be prescribed. A row with no range and no failure target
-- says nothing about what to do, which is worse than not having the row.
alter table program_exercises drop constraint if exists program_exercises_says_something;
alter table program_exercises add constraint program_exercises_says_something
  check (to_failure or target_rep_min is not null);

-- ---------------------------------------------------------------------------
-- program_day_cardio — the days that are a machine and a length of time
-- ---------------------------------------------------------------------------
-- One row per cardio day, rather than nine nullable columns on program_days
-- that are null for every strength day. A day either has a cardio prescription
-- or it does not, and a row says that better than a column full of nulls.
--
-- A day may have BOTH this and exercises. "Zone 2 plus carries" is a real day:
-- 45 minutes on the bike and three sets of suitcase carries, and a model that
-- forced a choice between them could not hold it.
create table if not exists program_day_cardio (
  program_day_id  uuid primary key references program_days (id) on delete cascade,

  -- What it is done on. Free text rather than a reference, because this names a
  -- machine in a gym and not an exercise in the library.
  machine         text not null,

  -- The steady portion, as a range. "45 to 55 minutes" is a range and storing
  -- its midpoint would be inventing a number nobody chose. A single figure is
  -- the same value in both columns.
  steady_min_low  integer check (steady_min_low > 0),
  steady_min_high integer check (steady_min_high > 0),

  -- The interval structure, for the days that have one: warm up, then work and
  -- easy alternating for so many rounds, then cool down. All five together or
  -- none of them, because four fifths of an interval session is not a session.
  warmup_min      integer check (warmup_min > 0),
  work_min        integer check (work_min > 0),
  easy_min        integer check (easy_min > 0),
  rounds          integer check (rounds > 0),
  cooldown_min    integer check (cooldown_min > 0),

  check (steady_min_high is null or steady_min_low is null
         or steady_min_high >= steady_min_low),

  -- All five interval columns, or none.
  constraint program_day_cardio_intervals_whole check (
    num_nulls(warmup_min, work_min, easy_min, rounds, cooldown_min) in (0, 5)
  ),

  -- And the row must describe something: a steady effort, an interval
  -- structure, or both.
  constraint program_day_cardio_says_something check (
    steady_min_low is not null or warmup_min is not null
  )
);

-- ---------------------------------------------------------------------------
-- program_stability_items — the block that opens every day
-- ---------------------------------------------------------------------------
-- Held once against the program, not copied onto each of its days. It is
-- literally the same block every day, so seven copies would mean seven edits to
-- change one thing and six chances to miss.
--
-- Not program_exercises rows, and the reason is worth stating. These are not
-- sets: crocodile breathing is two minutes of breathing and toe yoga is not a
-- lift. They carry no weight, produce no personal record, and are never logged.
-- Putting them in program_exercises would mean a nullable exercise reference, a
-- nullable set count and a nullable rep range — a table where half the columns
-- are empty for half the rows, and a checklist pretending to be training data.
--
-- Which is also why the name is free text rather than a library reference:
-- scapular CARs and toe yoga are not in the exercise library and should not be
-- added to it, because nothing about them is ever going to be logged.
create table if not exists program_stability_items (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs (id) on delete cascade,
  position      integer not null check (position >= 0),

  name          text not null,

  -- What to do, in words: "2 minutes", "2 sets of 8 per side, slow". A
  -- prescription rather than a number, because these are not counted the same
  -- way twice and forcing them into sets and reps would invent precision.
  --
  -- This is the one place in REIGN where a prescription is stored as text, and
  -- it is not a display string assembled from numbers: there are no numbers
  -- underneath it to assemble from.
  prescription  text not null,

  -- Whether it only applies on lifting days. The band work at the end of the
  -- block prepares the shoulder for pressing and pulling, so it belongs to a
  -- strength day and not to a bike ride.
  strength_only boolean not null default false,

  unique (program_id, position)
);

create index if not exists program_stability_items_program_id_idx
  on program_stability_items (program_id);

-- ---------------------------------------------------------------------------
-- Three movements the library does not have
-- ---------------------------------------------------------------------------
-- The Free Exercise DB covers this plan almost completely: of everything it
-- prescribes, only these three have no entry. Checked one by one against all
-- 876 rows rather than assumed.
--
-- They are added because all three are logged and progressed like any other
-- lift — one of them carries a stated benchmark — so they need somewhere for
-- their sets to point. The stability block's movements are NOT added, because
-- they are never logged.
--
-- The ids are prefixed so they are distinguishable from the source's own slugs
-- for ever. The library loader keys on id and would leave these alone if it
-- ever ran again.
insert into exercises (id, name, primary_muscle, secondary_muscles, equipment, category, mechanic)
values
  ('reign_dead_hang', 'Dead Hang', 'forearms',
   '{lats,shoulders,middle back}', 'body only', 'strength', 'compound'),
  ('reign_suitcase_carry', 'Suitcase Carry', 'abdominals',
   '{forearms,traps,glutes}', 'dumbbell', 'strength', 'compound'),
  ('reign_slow_step_down', 'Slow Step-Down', 'quadriceps',
   '{glutes,hamstrings,calves}', 'body only', 'strength', 'compound')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Access. The two new tables follow the same rule as everything else the owner
-- owns: signed in only. A program is their record, not public reference data.
-- ---------------------------------------------------------------------------
alter table program_day_cardio enable row level security;
alter table program_stability_items enable row level security;

drop policy if exists "Owner manages program day cardio" on program_day_cardio;
create policy "Owner manages program day cardio"
  on program_day_cardio for all
  to authenticated
  using (true) with check (true);

drop policy if exists "Owner manages program stability items" on program_stability_items;
create policy "Owner manages program stability items"
  on program_stability_items for all
  to authenticated
  using (true) with check (true);
