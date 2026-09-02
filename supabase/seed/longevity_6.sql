-- REIGN: the owner's Longevity 6 program.
--
-- Run this AFTER 0006_program_shape.sql. Paste it into the Supabase SQL editor
-- and run it whole.
--
-- WHAT THIS TOUCHES. One program, the one named 'Longevity 6'. It removes that
-- program if it is already there and puts it back, so running it twice leaves
-- one copy rather than two. Bigger Leaner Stronger is never read, never
-- written, and never referenced. Nothing else in the database is touched.
--
-- WHY THIS IS A SCRIPT AND NOT SEED DATA IN THE APP. 0004 said no program ships
-- with REIGN, for a reason that still holds: a published program's contents are
-- someone else's material. This is not that. It is the owner's own week,
-- arranged around four kinds of training that are a publicly discussed idea
-- rather than a document, written out by the owner in their own words. It lives
-- in their database, entered by them, exactly as BLS was.
--
-- The stability block is stored once against the program rather than copied
-- onto each of its days, because it is the same block every day.

begin;

-- Out with the old copy, if there is one. The days, their exercises, their
-- cardio and the stability block all go with it through the schema's cascades.
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

-- -------------------------------------------------------------------------
-- The stability block. Ten to twelve minutes, at the top of every day.
--
-- The last item is marked strength_only: band work prepares a shoulder for
-- pressing and pulling, which is not what a bike ride needs.
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- The seven days.
--
-- day_of_week follows PostgreSQL's convention, 0 Sunday through 6 Saturday.
-- The six training days run Monday to Saturday and the rest day is Sunday.
-- Nothing in the program demands that arrangement; it is the obvious reading of
-- six days and one rest day, and any day can be moved in the app afterwards.
--
-- The names carry no day number. "Day 1" is the program day counter CLAUDE.md
-- forbids, and the weekday already separates Tuesday's zone 2 from Thursday's.
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- The two bike days and the interval day.
-- -------------------------------------------------------------------------
cardio as (
  insert into program_day_cardio
    (program_day_id, machine, steady_min_low, steady_min_high,
     warmup_min, work_min, easy_min, rounds, cooldown_min)
  select days.id, c.machine, c.low, c.high, c.warmup, c.work, c.easy, c.rounds, c.cooldown
  from days join (values
    -- Zone 2: a range, because 45 to 55 minutes is a range and its midpoint is
    -- a number nobody chose.
    (1, 'Stationary bike', 45, 55, null::int, null::int, null::int, null::int, null::int),
    (3, 'Stationary bike', 45, 45, null,      null,      null,      null,      null),
    -- VO2 max: ten easy, then four hard and four easy four times, then ten easy.
    (5, 'Stationary bike', null, null, 10,    4,         4,         4,         10)
  ) as c(position, machine, low, high, warmup, work, easy, rounds, cooldown)
    on c.position = days.position
  returning 1
)

-- -------------------------------------------------------------------------
-- What each day prescribes.
--
-- unit says whether the numbers are reps or seconds. per_side says whether the
-- prescription is per side, which is a different amount of work and cannot be
-- recovered from the numbers. to_failure is for the one prescription that has
-- no target, because the target is failure.
-- -------------------------------------------------------------------------
insert into program_exercises
  (program_day_id, exercise_id, position, set_count,
   target_rep_min, target_rep_max, unit, per_side, to_failure, rest_seconds, notes)
select days.id, e.exercise_id, e.position, e.sets,
       e.rep_min, e.rep_max, e.unit, e.per_side, e.to_failure, e.rest, e.notes
from days join (values
  -- Strength A — hinge and pull
  (0, 'Romanian_Deadlift',      0, 3, 6::int,  8::int,   'reps',    false, false, 180::int,
      'Trap bar or barbell.'),
  (0, 'Chin-Up',                1, 3, 6,       8,        'reps',    false, false, 120,
      'Or lat pulldown. Four-second lowering on the final set.'),
  (0, 'One-Arm_Dumbbell_Row',   2, 3, 8,       10,       'reps',    true,  false, 90,   null),
  (0, 'Split_Squats',           3, 3, 8,       10,       'reps',    true,  false, 90,   null),
  (0, 'Hammer_Curls',           4, 2, 10,      12,       'reps',    false, false, 90,   null),
  (0, 'reign_dead_hang',        5, 2, null,    null,     'seconds', false, true,  90,
      'To near failure.'),

  -- Strength B — squat and press
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

  -- Zone 2 & Carries — the bike is above; this is the rest of the day
  (3, 'reign_suitcase_carry',   0, 3, 45,      45,       'seconds', true,  false, null, null),

  -- Strength C — full body, eccentric emphasis
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
