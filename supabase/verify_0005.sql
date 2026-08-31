-- Proves 0005 did what it claims. Run it in the Supabase SQL editor after 0005.
--
-- One result set at the end, because the editor shows only the last statement's
-- output. Everything before it parks its answer in a setting.
--
-- This script creates a throwaway exercise, pins things to it, tests what the
-- schema refuses, and deletes it. It leaves nothing behind, which the last
-- check proves rather than assumes.

-- ---------------------------------------------------------------------------
-- Part one: the access rule, as the roles themselves, inside a transaction.
--
-- SET LOCAL outside a transaction is silently ignored, which would make every
-- check below pass on a completely unprotected table. Committed and cleaned by
-- hand rather than rolled back, because a rollback also reverts the settings
-- the counts are parked in.
-- ---------------------------------------------------------------------------
begin;

insert into exercises (id, name, primary_muscle, secondary_muscles, equipment, category)
values ('reign-verify-a', 'Verification A', 'chest', '{triceps}', 'barbell', 'strength'),
       ('reign-verify-b', 'Verification B', 'chest', '{triceps}', 'dumbbell', 'strength');

insert into exercise_alternates (exercise_id, alternate_id, position)
values ('reign-verify-a', 'reign-verify-b', 0);

set local role authenticated;
select set_config('reign.pins_signed_in',
  (select count(*)::text from exercise_alternates), false);
-- The library itself stays readable without signing in, and mechanic is just
-- another column of it. This proves 0005 did not narrow that by accident.
select set_config('reign.library_signed_in',
  (select count(*)::text from exercises where id = 'reign-verify-a'), false);

set local role anon;
select set_config('reign.pins_signed_out',
  (select count(*)::text from exercise_alternates), false);
select set_config('reign.library_signed_out',
  (select count(*)::text from exercises where id = 'reign-verify-a'), false);

reset role;
commit;

-- ---------------------------------------------------------------------------
-- Part two: prove the constraints bite. A constraint nobody has tried to break
-- is a comment.
-- ---------------------------------------------------------------------------

-- Nothing is its own alternative.
do $$
begin
  insert into exercise_alternates (exercise_id, alternate_id)
  values ('reign-verify-a', 'reign-verify-a');
  perform set_config('reign.pin_itself', 'ALLOWED', false);
  delete from exercise_alternates where exercise_id = alternate_id;
exception when check_violation then
  perform set_config('reign.pin_itself', 'rejected', false);
end $$;

-- The same pair cannot be pinned twice.
do $$
begin
  insert into exercise_alternates (exercise_id, alternate_id)
  values ('reign-verify-a', 'reign-verify-b');
  perform set_config('reign.pin_twice', 'ALLOWED', false);
exception when unique_violation then
  perform set_config('reign.pin_twice', 'rejected', false);
end $$;

-- mechanic takes two values or nothing.
do $$
begin
  update exercises set mechanic = 'plyometric' where id = 'reign-verify-a';
  perform set_config('reign.bad_mechanic', 'ALLOWED', false);
  update exercises set mechanic = null where id = 'reign-verify-a';
exception when check_violation then
  perform set_config('reign.bad_mechanic', 'rejected', false);
end $$;

-- And null is allowed, because 87 source records carry no mechanic.
do $$
begin
  update exercises set mechanic = null where id = 'reign-verify-a';
  perform set_config('reign.null_mechanic', 'allowed', false);
exception when others then
  perform set_config('reign.null_mechanic', 'REFUSED', false);
end $$;

-- ---------------------------------------------------------------------------
-- Part three: the backfill actually landed, and deleting an exercise takes its
-- pins with it.
-- ---------------------------------------------------------------------------
select set_config('reign.tagged',
  (select count(*)::text from exercises
    where mechanic in ('compound', 'isolation')), false);

select set_config('reign.untagged',
  (select count(*)::text from exercises
    where mechanic is null and id not like 'reign-verify-%'), false);

-- A known compound lift and a known isolation one, so this is not just counting.
select set_config('reign.bench_is',
  coalesce((select mechanic from exercises
             where id = 'Barbell_Bench_Press_-_Medium_Grip'), 'missing'), false);
select set_config('reign.curl_is',
  coalesce((select mechanic from exercises
             where id = 'Dumbbell_Bicep_Curl'), 'missing'), false);

delete from exercises where id in ('reign-verify-a', 'reign-verify-b');

select set_config('reign.left_over',
  (select count(*)::text from exercise_alternates
    where exercise_id like 'reign-verify-%'
       or alternate_id like 'reign-verify-%'), false);

-- ---------------------------------------------------------------------------
-- Part four: the report.
-- ---------------------------------------------------------------------------
with checks as (
  select 'the mechanic column exists' as what,
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'exercises'
             and column_name = 'mechanic') as result,
         '1' as expected
  union all
  select 'the pins table exists',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public' and table_name = 'exercise_alternates'),
         '1'
  union all
  select 'row level security is on for the pins',
         (select relrowsecurity::text from pg_class
           where relname = 'exercise_alternates'),
         'true'
  union all
  select 'it has exactly one policy',
         (select count(*)::text from pg_policies
           where tablename = 'exercise_alternates'),
         '1'
  union all
  select 'the nine existing tables are untouched',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public'
             and table_name in ('exercises','splits','workouts','workout_exercises',
                                'sets','exercise_targets','cardio_sessions',
                                'hidden_exercises','programs')),
         '9'
  union all
  select '789 of the 876 exercises carry a mechanic',
         current_setting('reign.tagged', true), '789'
  union all
  select 'and 87 genuinely have none',
         current_setting('reign.untagged', true), '87'
  union all
  select 'a bench press is compound',
         current_setting('reign.bench_is', true), 'compound'
  union all
  select 'a bicep curl is isolation',
         current_setting('reign.curl_is', true), 'isolation'
  union all
  select 'signed in sees the pin',
         current_setting('reign.pins_signed_in', true), '1'
  union all
  select 'signed out sees no pins',
         current_setting('reign.pins_signed_out', true), '0'
  union all
  select 'the library is still readable signed in',
         current_setting('reign.library_signed_in', true), '1'
  union all
  select 'and still readable signed out, as reference data',
         current_setting('reign.library_signed_out', true), '1'
  union all
  select 'nothing can be its own alternative',
         current_setting('reign.pin_itself', true), 'rejected'
  union all
  select 'the same pair cannot be pinned twice',
         current_setting('reign.pin_twice', true), 'rejected'
  union all
  select 'mechanic takes two values or nothing',
         current_setting('reign.bad_mechanic', true), 'rejected'
  union all
  select 'and nothing is one of them',
         current_setting('reign.null_mechanic', true), 'allowed'
  union all
  select 'deleting an exercise took its pins with it',
         current_setting('reign.left_over', true), '0'
)
select what, result, expected,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from checks;
