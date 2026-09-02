-- Proves 0006 and the Longevity 6 script did what they claim.
-- Run it in the Supabase SQL editor AFTER both.
--
-- One result set at the end, because the editor shows only the last statement's
-- output. Everything before it parks its answer in a setting.
--
-- This script tries to break every constraint 0006 added, using a throwaway
-- program it deletes again. A constraint nobody has tried to break is a
-- comment. It leaves nothing behind, which the last check proves rather than
-- assumes, and it never reads or writes Bigger Leaner Stronger.

-- ---------------------------------------------------------------------------
-- Part one: the access rule, as the roles themselves, inside a transaction.
--
-- SET LOCAL outside a transaction is silently ignored, which would make these
-- pass on a completely unprotected table.
-- ---------------------------------------------------------------------------
begin;

insert into programs (id, name) values
  ('00000000-0000-4000-8000-00000000d006', 'Verification 0006');

insert into program_days (id, program_id, name, kind, position)
values ('00000000-0000-4000-8000-00000000d007',
        '00000000-0000-4000-8000-00000000d006', 'Verification day', 'zone2', 0);

insert into program_day_cardio (program_day_id, machine, steady_min_low, steady_min_high)
values ('00000000-0000-4000-8000-00000000d007', 'Stationary bike', 30, 40);

insert into program_stability_items (program_id, position, name, prescription)
values ('00000000-0000-4000-8000-00000000d006', 0, 'Verification item', '1 minute');

set local role authenticated;
-- Scoped to the row this script just made. Counting the whole table would
-- include Longevity 6's own rows and the check would pass on its data rather
-- than on the access rule it is meant to be testing.
select set_config('reign.cardio_signed_in',
  (select count(*)::text from program_day_cardio
    where program_day_id = '00000000-0000-4000-8000-00000000d007'), false);
select set_config('reign.stability_signed_in',
  (select count(*)::text from program_stability_items
    where program_id = '00000000-0000-4000-8000-00000000d006'), false);

set local role anon;
select set_config('reign.cardio_signed_out',
  (select count(*)::text from program_day_cardio
    where program_day_id = '00000000-0000-4000-8000-00000000d007'), false);
select set_config('reign.stability_signed_out',
  (select count(*)::text from program_stability_items
    where program_id = '00000000-0000-4000-8000-00000000d006'), false);

reset role;
commit;

-- ---------------------------------------------------------------------------
-- Part two: prove the constraints bite.
-- ---------------------------------------------------------------------------

-- A day is one of four kinds.
do $$
begin
  update program_days set kind = 'crossfit'
   where id = '00000000-0000-4000-8000-00000000d007';
  perform set_config('reign.bad_kind', 'ALLOWED', false);
  update program_days set kind = 'zone2'
   where id = '00000000-0000-4000-8000-00000000d007';
exception when check_violation then
  perform set_config('reign.bad_kind', 'rejected', false);
end $$;

-- A prescription is in reps or seconds and nothing else.
do $$
begin
  insert into program_exercises (program_day_id, exercise_id, position, set_count,
                                 target_rep_min, target_rep_max, unit)
  values ('00000000-0000-4000-8000-00000000d007', 'reign_dead_hang', 90, 3, 5, 5, 'metres');
  perform set_config('reign.bad_unit', 'ALLOWED', false);
  delete from program_exercises where position = 90;
exception when check_violation then
  perform set_config('reign.bad_unit', 'rejected', false);
end $$;

-- Half a rep range is a loading mistake.
do $$
begin
  insert into program_exercises (program_day_id, exercise_id, position, set_count,
                                 target_rep_min, target_rep_max)
  values ('00000000-0000-4000-8000-00000000d007', 'reign_dead_hang', 91, 3, 5, null);
  perform set_config('reign.half_range', 'ALLOWED', false);
  delete from program_exercises where position = 91;
exception when check_violation then
  perform set_config('reign.half_range', 'rejected', false);
end $$;

-- A row with no range and no failure target prescribes nothing.
do $$
begin
  insert into program_exercises (program_day_id, exercise_id, position, set_count,
                                 target_rep_min, target_rep_max, to_failure)
  values ('00000000-0000-4000-8000-00000000d007', 'reign_dead_hang', 92, 3, null, null, false);
  perform set_config('reign.says_nothing', 'ALLOWED', false);
  delete from program_exercises where position = 92;
exception when check_violation then
  perform set_config('reign.says_nothing', 'rejected', false);
end $$;

-- But no range WITH a failure target is exactly the dead hang, and is allowed.
do $$
begin
  insert into program_exercises (program_day_id, exercise_id, position, set_count,
                                 target_rep_min, target_rep_max, to_failure, unit)
  values ('00000000-0000-4000-8000-00000000d007', 'reign_dead_hang', 93, 2, null, null, true, 'seconds');
  perform set_config('reign.to_failure', 'allowed', false);
  delete from program_exercises where position = 93;
exception when others then
  perform set_config('reign.to_failure', 'REFUSED', false);
end $$;

-- Rest is a real duration or absent. Zero is not how you say "not prescribed".
do $$
begin
  insert into program_exercises (program_day_id, exercise_id, position, set_count,
                                 target_rep_min, target_rep_max, rest_seconds)
  values ('00000000-0000-4000-8000-00000000d007', 'reign_dead_hang', 94, 3, 5, 5, 0);
  perform set_config('reign.zero_rest', 'ALLOWED', false);
  delete from program_exercises where position = 94;
exception when check_violation then
  perform set_config('reign.zero_rest', 'rejected', false);
end $$;

-- Four fifths of an interval session is not a session.
do $$
begin
  update program_day_cardio set warmup_min = 10, work_min = 4, easy_min = 4, rounds = 4
   where program_day_id = '00000000-0000-4000-8000-00000000d007';
  perform set_config('reign.part_interval', 'ALLOWED', false);
  update program_day_cardio set warmup_min = null, work_min = null, easy_min = null, rounds = null
   where program_day_id = '00000000-0000-4000-8000-00000000d007';
exception when check_violation then
  perform set_config('reign.part_interval', 'rejected', false);
end $$;

-- A cardio row that names neither a steady effort nor an interval structure.
do $$
begin
  update program_day_cardio set steady_min_low = null, steady_min_high = null
   where program_day_id = '00000000-0000-4000-8000-00000000d007';
  perform set_config('reign.empty_cardio', 'ALLOWED', false);
  update program_day_cardio set steady_min_low = 30, steady_min_high = 40
   where program_day_id = '00000000-0000-4000-8000-00000000d007';
exception when check_violation then
  perform set_config('reign.empty_cardio', 'rejected', false);
end $$;

-- ---------------------------------------------------------------------------
-- Part three: the program landed, and BLS is untouched.
-- ---------------------------------------------------------------------------
select set_config('reign.l6_days',
  (select count(*)::text from program_days pd join programs p on p.id = pd.program_id
    where p.name = 'Longevity 6'), false);

select set_config('reign.l6_kinds',
  (select string_agg(kind, ',' order by position)
     from program_days pd join programs p on p.id = pd.program_id
    where p.name = 'Longevity 6'), false);

select set_config('reign.l6_exercises',
  (select count(*)::text from program_exercises pe
     join program_days pd on pd.id = pe.program_day_id
     join programs p on p.id = pd.program_id
    where p.name = 'Longevity 6'), false);

select set_config('reign.l6_stability',
  (select count(*)::text from program_stability_items psi
     join programs p on p.id = psi.program_id
    where p.name = 'Longevity 6'), false);

select set_config('reign.l6_cardio',
  (select count(*)::text from program_day_cardio c
     join program_days pd on pd.id = c.program_day_id
     join programs p on p.id = pd.program_id
    where p.name = 'Longevity 6'), false);

-- Every exercise it prescribes resolves to a real row in the library. A
-- foreign key already guarantees this, which is the point: it means the names
-- were matched before the script ran, not hoped at.
select set_config('reign.l6_unmatched',
  (select count(*)::text from program_exercises pe
     join program_days pd on pd.id = pe.program_day_id
     join programs p on p.id = pd.program_id
     left join exercises e on e.id = pe.exercise_id
    where p.name = 'Longevity 6' and e.id is null), false);

-- The three movements the library did not have.
select set_config('reign.added_movements',
  (select count(*)::text from exercises where id like 'reign\_%'), false);

-- Bigger Leaner Stronger, exactly as it was. Its days still read, its
-- exercises still count, and its kind defaulted to strength, which is what
-- they always were.
select set_config('reign.bls_days',
  (select count(*)::text from program_days pd join programs p on p.id = pd.program_id
    where p.name = 'Bigger Leaner Stronger'), false);

select set_config('reign.bls_exercises',
  (select count(*)::text from program_exercises pe
     join program_days pd on pd.id = pe.program_day_id
     join programs p on p.id = pd.program_id
    where p.name = 'Bigger Leaner Stronger'), false);

select set_config('reign.bls_all_strength',
  (select case when count(*) = count(*) filter (where kind = 'strength')
               then 'yes' else 'NO' end
     from program_days pd join programs p on p.id = pd.program_id
    where p.name = 'Bigger Leaner Stronger'), false);

-- Nothing lost from the rest of the database either.
select set_config('reign.tables',
  (select count(*)::text from information_schema.tables
    where table_schema = 'public'
      and table_name in ('exercises','splits','workouts','workout_exercises',
                         'sets','exercise_targets','cardio_sessions',
                         'hidden_exercises','programs','program_days',
                         'program_exercises','exercise_alternates',
                         'program_day_cardio','program_stability_items')), false);

delete from programs where id = '00000000-0000-4000-8000-00000000d006';

select set_config('reign.left_over',
  (select (count(*) filter (where false = false))::text from program_days
    where id = '00000000-0000-4000-8000-00000000d007'), false);

-- ---------------------------------------------------------------------------
-- Part four: the report.
-- ---------------------------------------------------------------------------
with checks as (
  select 'a day carries a kind' as what,
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'program_days'
             and column_name = 'kind') as result,
         '1' as expected
  union all
  select 'a program carries a description and notes',
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'programs'
             and column_name in ('description', 'notes')), '2'
  union all
  select 'a prescription carries rest, notes, unit, side and failure',
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'program_exercises'
             and column_name in ('rest_seconds','notes','unit','per_side','to_failure')), '5'
  union all
  select 'the cardio table exists',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public' and table_name = 'program_day_cardio'), '1'
  union all
  select 'the stability table exists',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public' and table_name = 'program_stability_items'), '1'
  union all
  select 'row level security is on for both',
         (select count(*)::text from pg_class
           where relname in ('program_day_cardio','program_stability_items')
             and relrowsecurity), '2'
  union all
  select 'signed in sees the cardio day',
         current_setting('reign.cardio_signed_in', true), '1'
  union all
  select 'signed out sees no cardio days',
         current_setting('reign.cardio_signed_out', true), '0'
  union all
  select 'signed in sees the stability block',
         current_setting('reign.stability_signed_in', true), '1'
  union all
  select 'signed out sees no stability block',
         current_setting('reign.stability_signed_out', true), '0'
  union all
  select 'a day must be one of the four kinds',
         current_setting('reign.bad_kind', true), 'rejected'
  union all
  select 'a prescription is in reps or seconds',
         current_setting('reign.bad_unit', true), 'rejected'
  union all
  select 'half a rep range is refused',
         current_setting('reign.half_range', true), 'rejected'
  union all
  select 'a prescription that says nothing is refused',
         current_setting('reign.says_nothing', true), 'rejected'
  union all
  select 'but no range with a failure target is the dead hang, and allowed',
         current_setting('reign.to_failure', true), 'allowed'
  union all
  select 'zero is not how you say rest was not prescribed',
         current_setting('reign.zero_rest', true), 'rejected'
  union all
  select 'four fifths of an interval session is refused',
         current_setting('reign.part_interval', true), 'rejected'
  union all
  select 'a cardio day describing nothing is refused',
         current_setting('reign.empty_cardio', true), 'rejected'
  union all
  select 'Longevity 6 has seven days',
         current_setting('reign.l6_days', true), '7'
  union all
  select 'in the right order and kinds',
         current_setting('reign.l6_kinds', true),
         'strength,zone2,strength,zone2,strength,vo2max,rest'
  union all
  select 'with nineteen prescriptions',
         current_setting('reign.l6_exercises', true), '19'
  union all
  select 'a seven-item stability block',
         current_setting('reign.l6_stability', true), '7'
  union all
  select 'and three cardio days',
         current_setting('reign.l6_cardio', true), '3'
  union all
  select 'every exercise it names is a real library row',
         current_setting('reign.l6_unmatched', true), '0'
  union all
  select 'the three missing movements were added',
         current_setting('reign.added_movements', true), '3'
  union all
  select 'Bigger Leaner Stronger still has five days',
         current_setting('reign.bls_days', true), '5'
  union all
  select 'and all twenty of its exercises',
         current_setting('reign.bls_exercises', true), '20'
  union all
  select 'and every one of its days reads as strength',
         current_setting('reign.bls_all_strength', true), 'yes'
  union all
  select 'all fourteen tables are present',
         current_setting('reign.tables', true), '14'
  union all
  select 'the verification program left nothing behind',
         current_setting('reign.left_over', true), '0'
)
select what, result, expected,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from checks;
