-- Verification. Run this last, after the other three.
--
-- Every row of the result should read PASS. Anything else names what is wrong.

select 'seven tables exist' as check,
       case when count(*) = 7 then 'PASS' else 'FAIL — found ' || count(*) end as result,
       string_agg(tablename, ', ' order by tablename) as detail
from pg_tables
where schemaname = 'public'
  and tablename in ('exercises', 'splits', 'workouts', 'workout_exercises',
                    'sets', 'exercise_targets', 'cardio_sessions')

union all

select 'row level security on every table',
       case when count(*) = 7 then 'PASS' else 'FAIL — only ' || count(*) || ' protected' end,
       string_agg(relname, ', ' order by relname)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relrowsecurity
  and relname in ('exercises', 'splits', 'workouts', 'workout_exercises',
                  'sets', 'exercise_targets', 'cardio_sessions')

union all

select 'exercises loaded',
       case when count(*) = 876 then 'PASS' else 'CHECK — found ' || count(*) || ', expected 876' end,
       count(*)::text || ' exercises'
from exercises

union all

select 'the muscles the variety feature needs',
       case when count(distinct primary_muscle) = 4 then 'PASS' else 'FAIL' end,
       string_agg(distinct primary_muscle, ', ')
from exercises
where primary_muscle in ('lats', 'traps', 'middle back', 'lower back')

union all

select 'instructions survived in order',
       case when array_length(instructions, 1) > 1 then 'PASS' else 'FAIL' end,
       left(instructions[1], 60) || '...'
from exercises
where id = 'Barbell_Bench_Press_-_Medium_Grip'

union all

select 'training tables are empty, as expected',
       case when (select count(*) from workouts) = 0
             and (select count(*) from sets) = 0
            then 'PASS' else 'CHECK — unexpected rows' end,
       'no workouts logged yet';
