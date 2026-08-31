-- Proves 0004 did what it claims. Run it in the Supabase SQL editor after 0004.
--
-- One result set at the end, because the editor shows only the last statement's
-- output. Everything before it parks its answer in a setting.
--
-- This script creates a program, tests it, and deletes it. It leaves nothing
-- behind, which the last check proves rather than assumes.

-- ---------------------------------------------------------------------------
-- Part one: the access rule, as the roles themselves, inside a transaction.
--
-- SET LOCAL outside a transaction is silently ignored, which would make every
-- check below pass on a completely unprotected table.
--
-- The transaction is committed and the rows removed by hand rather than rolled
-- back. A rollback also reverts the settings the counts are parked in, which
-- leaves the report reading blanks. That mistake has been made twice in this
-- project; it is written down here so it is not made a third time.
-- ---------------------------------------------------------------------------
begin;

insert into programs (id, name, is_active)
values ('00000000-0000-4000-8000-000000000004', 'Verification', true);

insert into program_days (id, program_id, name, target_muscles, day_of_week, position)
values (
  '00000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-000000000004',
  'Push', array['chest', 'shoulders', 'triceps'], 1, 0
);

insert into program_exercises
  (program_day_id, exercise_id, position, set_count, target_rep_min, target_rep_max)
select '00000000-0000-4000-8000-000000000005', id, 0, 3, 8, 10
from exercises limit 1;

set local role authenticated;
select set_config('reign.signed_in',
  (select count(*)::text from programs), false);
select set_config('reign.signed_in_days',
  (select count(*)::text from program_days), false);
select set_config('reign.signed_in_exercises',
  (select count(*)::text from program_exercises), false);

set local role anon;
select set_config('reign.signed_out',
  (select count(*)::text from programs), false);
select set_config('reign.signed_out_days',
  (select count(*)::text from program_days), false);
select set_config('reign.signed_out_exercises',
  (select count(*)::text from program_exercises), false);

reset role;
commit;

-- ---------------------------------------------------------------------------
-- Part two: prove the constraints actually bite.
--
-- A constraint nobody has tried to break is a comment. Each of these attempts
-- the thing the schema forbids and records whether the database refused.
-- ---------------------------------------------------------------------------

-- Only one program may be active.
do $$
begin
  insert into programs (name, is_active) values ('Second active', true);
  perform set_config('reign.two_active', 'ALLOWED', false);
  delete from programs where name = 'Second active';
exception when unique_violation then
  perform set_config('reign.two_active', 'rejected', false);
end $$;

-- Any number may be inactive, though.
do $$
begin
  insert into programs (name, is_active) values ('Second inactive', false);
  insert into programs (name, is_active) values ('Third inactive', false);
  perform set_config('reign.many_inactive', 'allowed', false);
  delete from programs where name in ('Second inactive', 'Third inactive');
exception when others then
  perform set_config('reign.many_inactive', 'REFUSED', false);
end $$;

-- Two days of one program may not claim the same weekday.
do $$
begin
  insert into program_days (program_id, name, day_of_week, position)
  values ('00000000-0000-4000-8000-000000000004', 'Also Monday', 1, 1);
  perform set_config('reign.two_mondays', 'ALLOWED', false);
  delete from program_days where name = 'Also Monday';
exception when unique_violation then
  perform set_config('reign.two_mondays', 'rejected', false);
end $$;

-- A day with no weekday is allowed, and more than one of them.
do $$
begin
  insert into program_days (program_id, name, day_of_week, position)
  values ('00000000-0000-4000-8000-000000000004', 'Unplaced one', null, 2);
  insert into program_days (program_id, name, day_of_week, position)
  values ('00000000-0000-4000-8000-000000000004', 'Unplaced two', null, 3);
  perform set_config('reign.unassigned_days', 'allowed', false);
exception when others then
  perform set_config('reign.unassigned_days', 'REFUSED', false);
end $$;

-- A rep range that runs backwards is not a range.
do $$
begin
  insert into program_exercises
    (program_day_id, exercise_id, position, set_count, target_rep_min, target_rep_max)
  select '00000000-0000-4000-8000-000000000005', id, 9, 3, 10, 8 from exercises limit 1;
  perform set_config('reign.backwards_range', 'ALLOWED', false);
  delete from program_exercises where position = 9;
exception when check_violation then
  perform set_config('reign.backwards_range', 'rejected', false);
end $$;

-- A prescription of no sets is not a prescription.
do $$
begin
  insert into program_exercises
    (program_day_id, exercise_id, position, set_count, target_rep_min, target_rep_max)
  select '00000000-0000-4000-8000-000000000005', id, 8, 0, 8, 10 from exercises limit 1;
  perform set_config('reign.no_sets', 'ALLOWED', false);
  delete from program_exercises where position = 8;
exception when check_violation then
  perform set_config('reign.no_sets', 'rejected', false);
end $$;

-- ---------------------------------------------------------------------------
-- Part three: deleting a program takes its days and their exercises with it,
-- so there is nothing orphaned to clean up later.
-- ---------------------------------------------------------------------------
delete from programs where id = '00000000-0000-4000-8000-000000000004';

select set_config('reign.left_over',
  (select (
     (select count(*) from programs) +
     (select count(*) from program_days) +
     (select count(*) from program_exercises)
   )::text), false);

-- ---------------------------------------------------------------------------
-- Part four: the report.
-- ---------------------------------------------------------------------------
with checks as (
  select 'the three tables exist' as what,
         (select count(*)::text from information_schema.tables
           where table_schema = 'public'
             and table_name in ('programs', 'program_days', 'program_exercises'))
         as result,
         '3' as expected
  union all
  select 'row level security is on for all three',
         (select count(*)::text from pg_class
           where relname in ('programs', 'program_days', 'program_exercises')
             and relrowsecurity),
         '3'
  union all
  select 'one policy each',
         (select count(*)::text from pg_policies
           where tablename in ('programs', 'program_days', 'program_exercises')),
         '3'
  union all
  select 'the eight existing tables are untouched',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public'
             and table_name in ('exercises','splits','workouts','workout_exercises',
                                'sets','exercise_targets','cardio_sessions',
                                'hidden_exercises')),
         '8'
  union all
  select 'signed in sees the program',
         current_setting('reign.signed_in', true), '1'
  union all
  select 'signed in sees its day',
         current_setting('reign.signed_in_days', true), '1'
  union all
  select 'signed in sees its exercise',
         current_setting('reign.signed_in_exercises', true), '1'
  union all
  select 'signed out sees no program',
         current_setting('reign.signed_out', true), '0'
  union all
  select 'signed out sees no day',
         current_setting('reign.signed_out_days', true), '0'
  union all
  select 'signed out sees no exercise',
         current_setting('reign.signed_out_exercises', true), '0'
  union all
  select 'a second active program is refused',
         current_setting('reign.two_active', true), 'rejected'
  union all
  select 'any number of inactive ones is fine',
         current_setting('reign.many_inactive', true), 'allowed'
  union all
  select 'two days on one weekday are refused',
         current_setting('reign.two_mondays', true), 'rejected'
  union all
  select 'days with no weekday are fine, and more than one',
         current_setting('reign.unassigned_days', true), 'allowed'
  union all
  select 'a backwards rep range is refused',
         current_setting('reign.backwards_range', true), 'rejected'
  union all
  select 'a prescription of no sets is refused',
         current_setting('reign.no_sets', true), 'rejected'
  union all
  select 'deleting a program took its days and exercises with it',
         current_setting('reign.left_over', true), '0'
)
select what, result, expected,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from checks;
