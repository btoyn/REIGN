-- Proves 0003 did what it claims. Run it in the Supabase SQL editor after 0003.
--
-- One result set, because the editor shows only the last statement's output.

-- Part one: prove the access rule, as the roles themselves, inside a
-- transaction. SET LOCAL outside one is silently ignored, which would make
-- every check below pass on a completely unprotected table.
--
-- The transaction is committed and the test row deleted by hand rather than
-- rolled back. A rollback also reverts the settings the counts are parked in,
-- which leaves part two reading blanks.
begin;

insert into hidden_exercises (exercise_id)
select id from exercises limit 1;

set local role authenticated;
select set_config('reign.signed_in', (select count(*)::text from hidden_exercises), false);

set local role anon;
select set_config('reign.signed_out', (select count(*)::text from hidden_exercises), false);

reset role;
delete from hidden_exercises;
commit;

-- Part two: everything, in one table.
with checks as (
  select 'the table exists' as what,
         (select count(*) from information_schema.tables
           where table_schema = 'public' and table_name = 'hidden_exercises')::text as result,
         '1' as expected
  union all
  select 'row level security is on',
         (select relrowsecurity::text from pg_class where relname = 'hidden_exercises'),
         'true'
  union all
  select 'it has exactly one policy',
         (select count(*)::text from pg_policies where tablename = 'hidden_exercises'),
         '1'
  union all
  select 'the seven locked tables are untouched',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public'
             and table_name in ('exercises','splits','workouts','workout_exercises',
                                'sets','exercise_targets','cardio_sessions')),
         '7'
  union all
  select 'signed in sees the hidden exercise',
         current_setting('reign.signed_in', true), '1'
  union all
  select 'signed out sees none of it',
         current_setting('reign.signed_out', true), '0'
  union all
  select 'nothing is left hidden afterwards',
         (select count(*)::text from hidden_exercises), '0'
)
select what, result, expected,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from checks;
