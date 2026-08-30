-- Does the lock actually hold?
--
-- Paste the whole file and press Run once. Everything comes back as a single
-- table, because the Supabase SQL editor only displays the last result.
--
-- Nothing is kept. A fake workout is written so the check means something,
-- then deleted again before the results are shown.
--
-- Expect:
--   signed out, your workouts     0
--   signed in, your workouts      1
--   signed out, exercise library  876
--   fake workout cleaned up       0
-- followed by one row per access rule.
--
-- Zero and then one is the whole point. The same workout exists in both
-- cases: a stranger sees none of it, you see it.

insert into workouts (date, split_name) values (current_date, 'REIGN LOCK TEST');

-- Each count is taken while pretending to be a signed-out visitor or a
-- signed-in account, then parked in a setting so it survives the role change
-- and can be read back together at the end.
set role anon;
select set_config('reign.out_workouts', (select count(*) from workouts)::text, false);

set role authenticated;
select set_config('reign.in_workouts', (select count(*) from workouts)::text, false);

set role anon;
select set_config('reign.out_exercises', (select count(*) from exercises)::text, false);

reset role;

delete from workouts where split_name = 'REIGN LOCK TEST';

select set_config('reign.left_behind', (select count(*) from workouts)::text, false);

-- The single result.
select 'signed out, your workouts' as check,
       current_setting('reign.out_workouts') as number
union all
select 'signed in, your workouts',
       current_setting('reign.in_workouts')
union all
select 'signed out, exercise library',
       current_setting('reign.out_exercises')
union all
select 'fake workout cleaned up',
       current_setting('reign.left_behind')
union all
select 'rule on ' || tablename,
       cmd || ' to ' || array_to_string(roles, ', ')
from pg_policies
where schemaname = 'public';
