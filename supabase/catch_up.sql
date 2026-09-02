-- REIGN catch-up: everything the database is missing, in one run.
--
-- Paste the whole thing into the Supabase SQL editor and run it once.
--
-- WHAT THIS IS. Migration 0005, migration 0006, the Longevity 6 program and
-- migration 0007, concatenated in the order they have to run. 0006 adds three
-- movements using the column 0005 creates, so running them out of order fails.
--
-- The explanatory comments are stripped so this fits in one paste. Every
-- statement is byte for byte the one in the file it came from; the files
-- themselves, with their reasoning intact, are in supabase/.
--
-- SAFE TO RUN AGAIN. Each migration is written to be repeatable, and the
-- Longevity 6 section deletes its own program before rebuilding it, so a second
-- run leaves one copy rather than two.
--
-- BIGGER LEANER STRONGER IS NEVER TOUCHED. It is not read and not written.
-- Rehearsed against a copy of the database this is meant for — 876 exercises,
-- BLS with five days and twenty exercises, nothing past 0004 — run twice, after
-- which BLS still had its five days and twenty exercises and Longevity 6 had
-- one copy. Then verify_0005, verify_0006 and verify_0007 passed 18, 30 and 20.
--
-- AFTERWARDS run supabase/verify_0006.sql and expect 30 PASS.

-- ========================================================================
-- 0005 — mechanic, and pinned alternates
-- ========================================================================
alter table exercises add column if not exists mechanic text;

comment on column exercises.mechanic is
  'Nullable. 87 of the 876 source records carry no mechanic value.';

alter table exercises drop constraint if exists exercises_mechanic_check;
alter table exercises add constraint exercises_mechanic_check
  check (mechanic is null or mechanic in ('compound', 'isolation'));

create extension if not exists http with schema extensions;

with source as (
  select (
    extensions.http_get(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
    )
  ).content::jsonb as doc
),
tagged as (
  select x ->> 'id' as id, x ->> 'mechanic' as mechanic
  from source, lateral jsonb_array_elements(source.doc) as x
)
update exercises e
set mechanic = tagged.mechanic
from tagged
where e.id = tagged.id
  and tagged.mechanic is not null;

create table if not exists exercise_alternates (
  exercise_id   text not null references exercises (id) on delete cascade,
  alternate_id  text not null references exercises (id) on delete cascade,

  position      integer not null default 0 check (position >= 0),

  primary key (exercise_id, alternate_id),

  constraint exercise_alternates_not_itself check (exercise_id <> alternate_id)
);

create index if not exists exercise_alternates_alternate_id_idx
  on exercise_alternates (alternate_id);

alter table exercise_alternates enable row level security;

drop policy if exists "Owner manages exercise alternates" on exercise_alternates;
create policy "Owner manages exercise alternates"
  on exercise_alternates for all
  to authenticated
  using (true) with check (true);

-- ========================================================================
-- 0006 — programs that are not only lifting
-- ========================================================================
alter table programs add column if not exists description text;

alter table programs add column if not exists notes text[] not null default '{}';

alter table program_days add column if not exists kind text not null default 'strength';

alter table program_days drop constraint if exists program_days_kind_check;
alter table program_days add constraint program_days_kind_check
  check (kind in ('strength', 'zone2', 'vo2max', 'rest'));

alter table program_days add column if not exists notes text;

alter table program_exercises add column if not exists rest_seconds integer;
alter table program_exercises drop constraint if exists program_exercises_rest_check;
alter table program_exercises add constraint program_exercises_rest_check
  check (rest_seconds is null or rest_seconds > 0);

alter table program_exercises add column if not exists notes text;

alter table program_exercises add column if not exists unit text not null default 'reps';
alter table program_exercises drop constraint if exists program_exercises_unit_check;
alter table program_exercises add constraint program_exercises_unit_check
  check (unit in ('reps', 'seconds'));

alter table program_exercises
  add column if not exists per_side boolean not null default false;

alter table program_exercises
  add column if not exists to_failure boolean not null default false;

alter table program_exercises alter column target_rep_min drop not null;
alter table program_exercises alter column target_rep_max drop not null;

alter table program_exercises drop constraint if exists program_exercises_range_paired;
alter table program_exercises add constraint program_exercises_range_paired
  check ((target_rep_min is null) = (target_rep_max is null));

alter table program_exercises drop constraint if exists program_exercises_says_something;
alter table program_exercises add constraint program_exercises_says_something
  check (to_failure or target_rep_min is not null);

create table if not exists program_day_cardio (
  program_day_id  uuid primary key references program_days (id) on delete cascade,

  machine         text not null,

  steady_min_low  integer check (steady_min_low > 0),
  steady_min_high integer check (steady_min_high > 0),

  warmup_min      integer check (warmup_min > 0),
  work_min        integer check (work_min > 0),
  easy_min        integer check (easy_min > 0),
  rounds          integer check (rounds > 0),
  cooldown_min    integer check (cooldown_min > 0),

  check (steady_min_high is null or steady_min_low is null
         or steady_min_high >= steady_min_low),

  constraint program_day_cardio_intervals_whole check (
    num_nulls(warmup_min, work_min, easy_min, rounds, cooldown_min) in (0, 5)
  ),

  constraint program_day_cardio_says_something check (
    steady_min_low is not null or warmup_min is not null
  )
);

create table if not exists program_stability_items (
  id            uuid primary key default gen_random_uuid(),
  program_id    uuid not null references programs (id) on delete cascade,
  position      integer not null check (position >= 0),

  name          text not null,

  prescription  text not null,

  strength_only boolean not null default false,

  unique (program_id, position)
);

create index if not exists program_stability_items_program_id_idx
  on program_stability_items (program_id);

insert into exercises (id, name, primary_muscle, secondary_muscles, equipment, category, mechanic)
values
  ('reign_dead_hang', 'Dead Hang', 'forearms',
   '{lats,shoulders,middle back}', 'body only', 'strength', 'compound'),
  ('reign_suitcase_carry', 'Suitcase Carry', 'abdominals',
   '{forearms,traps,glutes}', 'dumbbell', 'strength', 'compound'),
  ('reign_slow_step_down', 'Slow Step-Down', 'quadriceps',
   '{glutes,hamstrings,calves}', 'body only', 'strength', 'compound')
on conflict (id) do nothing;

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

-- ========================================================================
-- Longevity 6 — the program itself
-- ========================================================================
begin;

delete from programs where name = 'Longevity 6';

with new_program as (
  insert into programs (name, description, is_active, notes)
  values (
    'Longevity 6',
    'Six training days a week across stability, strength, aerobic base and peak aerobic capacity. Sixty to seventy-five minutes a session.',
    false,
    array[
      'Overhead barbell pressing is left out on purpose, for a shoulder. Do not substitute it back in.',
      'Two benchmarks, tested occasionally rather than weekly: a farmer carry at bodyweight total, half in each hand, for sixty seconds; and a dead hang approaching two minutes.'
    ]
  )
  returning id
),

stability as (
  insert into program_stability_items (program_id, position, name, prescription, strength_only)
  select new_program.id, item.position, item.name, item.prescription, item.strength_only
  from new_program, (values
    (0, 'Crocodile breathing',      '2 minutes',                   false),
    (1, '90/90 dead bug',           '2 sets of 8 per side, slow',  false),
    (2, 'Cat/cow',                  '8 reps',                      false),
    (3, 'Scapular CARs',            '5 slow rotations per side',   false),
    (4, 'Toe yoga',                 '1 to 2 minutes',              false),
    (5, 'Single-leg balance',       '45 seconds per side',         false),
    (6, 'Band scapular retraction', '2 sets of 10',                true)
  ) as item(position, name, prescription, strength_only)
  returning 1
),

days as (
  insert into program_days (program_id, name, kind, target_muscles, day_of_week, position, notes)
  select new_program.id, d.name, d.kind, d.muscles, d.dow, d.position, d.notes
  from new_program, (values
    (0, 'Strength A',  'strength', 1,
        array['hamstrings','glutes','lats','middle back','biceps'],
        'Hinge and pull.'),
    (1, 'Zone 2',      'zone2',    2,
        array[]::text[],
        'The highest effort where holding a conversation is just becoming uncomfortable. Not before a lifting session.'),
    (2, 'Strength B',  'strength', 3,
        array['quadriceps','shoulders','glutes','middle back'],
        'Squat and press.'),
    (3, 'Zone 2 & Carries', 'zone2', 4,
        array['abdominals','forearms'],
        null),
    (4, 'Strength C',  'strength', 5,
        array['quadriceps','chest','lats','hamstrings'],
        'Full body, eccentric emphasis.'),
    (5, 'VO2 Max',     'vo2max',   6,
        array[]::text[],
        'Hard means the most you can hold for the full four minutes, not a sprint.'),
    (6, 'Rest',        'rest',     0,
        array[]::text[],
        'Rest, or an easy walk.')
  ) as d(position, name, kind, dow, muscles, notes)
  returning id, position
),

cardio as (
  insert into program_day_cardio
    (program_day_id, machine, steady_min_low, steady_min_high,
     warmup_min, work_min, easy_min, rounds, cooldown_min)
  select days.id, c.machine, c.low, c.high, c.warmup, c.work, c.easy, c.rounds, c.cooldown
  from days join (values
    (1, 'Stationary bike', 45, 55, null::int, null::int, null::int, null::int, null::int),
    (3, 'Stationary bike', 45, 45, null,      null,      null,      null,      null),
    (5, 'Stationary bike', null, null, 10,    4,         4,         4,         10)
  ) as c(position, machine, low, high, warmup, work, easy, rounds, cooldown)
    on c.position = days.position
  returning 1
)

insert into program_exercises
  (program_day_id, exercise_id, position, set_count,
   target_rep_min, target_rep_max, unit, per_side, to_failure, rest_seconds, notes)
select days.id, e.exercise_id, e.position, e.sets,
       e.rep_min, e.rep_max, e.unit, e.per_side, e.to_failure, e.rest, e.notes
from days join (values
  (0, 'Romanian_Deadlift',      0, 3, 6::int,  8::int,   'reps',    false, false, 180::int,
      'Trap bar or barbell.'),
  (0, 'Chin-Up',                1, 3, 6,       8,        'reps',    false, false, 120,
      'Or lat pulldown. Four-second lowering on the final set.'),
  (0, 'One-Arm_Dumbbell_Row',   2, 3, 8,       10,       'reps',    true,  false, 90,   null),
  (0, 'Split_Squats',           3, 3, 8,       10,       'reps',    true,  false, 90,   null),
  (0, 'Hammer_Curls',           4, 2, 10,      12,       'reps',    false, false, 90,   null),
  (0, 'reign_dead_hang',        5, 2, null,    null,     'seconds', false, true,  90,
      'To near failure.'),

  (2, 'Goblet_Squat',           0, 3, 6,       8,        'reps',    false, false, 180,
      'Or front squat.'),
  (2, 'Dumbbell_Shoulder_Press',1, 3, 8,       10,       'reps',    false, false, 120,
      'Landmine press or neutral grip. A shoulder-friendly stand-in for overhead pressing.'),
  (2, 'Seated_Cable_Rows',      2, 3, 10,      12,       'reps',    false, false, 90,   null),
  (2, 'Leg_Press',              3, 3, 10,      10,       'reps',    false, false, 90,
      'Or step-up, ten reps per side.'),
  (2, 'Face_Pull',              4, 3, 12,      15,       'reps',    false, false, 60,
      'Or band external rotation.'),
  (2, 'Farmers_Walk',           5, 3, 60,      60,       'seconds', false, false, 90,   null),

  (3, 'reign_suitcase_carry',   0, 3, 45,      45,       'seconds', true,  false, null, null),

  (4, 'reign_slow_step_down',   0, 3, 6,       6,        'reps',    true,  false, 120,
      'Three-second descent from a box.'),
  (4, 'Incline_Dumbbell_Press', 1, 3, 8,       10,       'reps',    false, false, 120,
      'Controlled lowering.'),
  (4, 'Wide-Grip_Lat_Pulldown', 2, 3, 8,       8,        'reps',    false, false, 120,
      'Eccentric accentuated. Four seconds down.'),
  (4, 'Dumbbell_Rear_Lunge',    3, 3, 8,       10,       'reps',    true,  false, 90,
      'Reverse lunge.'),
  (4, 'Seated_Leg_Curl',        4, 3, 10,      12,       'reps',    false, false, 90,   null),
  (4, 'reign_suitcase_carry',   5, 3, 45,      45,       'seconds', true,  false, 60,   null)
) as e(day_position, exercise_id, position, sets,
       rep_min, rep_max, unit, per_side, to_failure, rest, notes)
  on e.day_position = days.position;

commit;

-- ========================================================================
-- 0007 — the Apple Health export
-- ========================================================================
alter table workouts
  add column if not exists sent_to_health boolean not null default false;

alter table cardio_sessions
  add column if not exists sent_to_health boolean not null default false;

alter table cardio_sessions add column if not exists started_at timestamptz;
alter table cardio_sessions add column if not exists finished_at timestamptz;

alter table cardio_sessions drop constraint if exists cardio_sessions_span_check;
alter table cardio_sessions add constraint cardio_sessions_span_check
  check (finished_at is null or started_at is null or finished_at >= started_at);

comment on column cardio_sessions.started_at is
  'Derived at log time from the entered duration. Null for sessions recorded before the Health export existed.';

create table if not exists app_settings (
  id boolean primary key default true check (id),

  health_shortcut_name text not null default 'LogREIGN'
    check (length(trim(health_shortcut_name)) > 0)
);

insert into app_settings (id) values (true) on conflict (id) do nothing;

alter table app_settings enable row level security;

drop policy if exists "Owner manages settings" on app_settings;
create policy "Owner manages settings"
  on app_settings for all
  to authenticated
  using (true) with check (true);

