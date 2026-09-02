-- Proves 0008 did what it claims. Run it in the Supabase SQL editor after 0008.
--
-- One result set at the end, because the editor shows only the last statement's
-- output. Everything before it parks its answer in a setting.
--
-- This script writes throwaway weigh-ins, tries to break what the schema should
-- refuse, and deletes them. It leaves nothing behind, which the last check
-- proves rather than assumes.

-- ---------------------------------------------------------------------------
-- Part one: the access rule, as the roles themselves, inside a transaction.
--
-- SET LOCAL outside a transaction is silently ignored, which would make these
-- pass on a completely unprotected table.
-- ---------------------------------------------------------------------------
begin;

-- No id given: the default generates one. Writing a literal uuid here is how
-- the first draft of this script failed, on a "uuid" containing the letter w.
-- The rows are identified by their dates, which are already unique.
insert into bodyweight (date, weight) values (date '1990-01-01', 185.40);

set local role authenticated;
select set_config('reign.bw_signed_in',
  (select count(*)::text from bodyweight where date = date '1990-01-01'), false);
set local role anon;
select set_config('reign.bw_signed_out',
  (select count(*)::text from bodyweight where date = date '1990-01-01'), false);
reset role;
commit;

-- ---------------------------------------------------------------------------
-- Part two: prove the constraints bite.
-- ---------------------------------------------------------------------------

-- One reading per day. A second is a correction, not another row.
do $$
begin
  insert into bodyweight (date, weight) values (date '1990-01-01', 186.00);
  perform set_config('reign.two_per_day', 'ALLOWED', false);
  delete from bodyweight where date = date '1990-01-01' and weight = 186.00;
exception when unique_violation then
  perform set_config('reign.two_per_day', 'rejected', false);
end $$;

-- Which means correcting it is an upsert, and has to work.
do $$
begin
  insert into bodyweight (date, weight) values (date '1990-01-01', 186.00)
    on conflict (date) do update set weight = excluded.weight;
  perform set_config('reign.correction',
    (select weight::text from bodyweight where date = date '1990-01-01'), false);
exception when others then
  perform set_config('reign.correction', 'FAILED', false);
end $$;

-- Nobody weighs nothing.
do $$
begin
  insert into bodyweight (date, weight) values (date '1990-01-02', 0);
  perform set_config('reign.zero', 'ALLOWED', false);
  delete from bodyweight where date = date '1990-01-02';
exception when check_violation then
  perform set_config('reign.zero', 'rejected', false);
end $$;

do $$
begin
  insert into bodyweight (date, weight) values (date '1990-01-03', -5);
  perform set_config('reign.negative', 'ALLOWED', false);
  delete from bodyweight where date = date '1990-01-03';
exception when check_violation then
  perform set_config('reign.negative', 'rejected', false);
end $$;

-- A weigh-in with no date is not a weigh-in.
do $$
begin
  insert into bodyweight (date, weight) values (null, 185);
  perform set_config('reign.no_date', 'ALLOWED', false);
  delete from bodyweight where date is null;
exception when not_null_violation then
  perform set_config('reign.no_date', 'rejected', false);
end $$;

-- The decimal survives. Rounding it away at write time would throw out the
-- only part of a weekly change that is visible.
do $$
begin
  update bodyweight set weight = 185.40 where date = date '1990-01-01';
  perform set_config('reign.decimal',
    (select weight::text from bodyweight where date = date '1990-01-01'), false);
end $$;

-- Four whole digits do not fit, which is what numeric(5,2) means.
do $$
begin
  insert into bodyweight (date, weight) values (date '1990-01-04', 1000.00);
  perform set_config('reign.too_big', 'ALLOWED', false);
  delete from bodyweight where date = date '1990-01-04';
exception when numeric_value_out_of_range then
  perform set_config('reign.too_big', 'rejected', false);
end $$;

delete from bodyweight where date between date '1990-01-01' and date '1990-01-04';

select set_config('reign.left_over',
  (select count(*)::text from bodyweight
    where date between date '1990-01-01' and date '1990-01-04'), false);

select set_config('reign.tables',
  (select count(*)::text from information_schema.tables
    where table_schema = 'public'
      and table_name in ('exercises','splits','workouts','workout_exercises',
                         'sets','exercise_targets','cardio_sessions',
                         'hidden_exercises','programs','program_days',
                         'program_exercises','exercise_alternates',
                         'program_day_cardio','program_stability_items',
                         'app_settings','bodyweight')), false);

-- ---------------------------------------------------------------------------
-- Part three: the report.
-- ---------------------------------------------------------------------------
with checks as (
  select 'the bodyweight table exists' as what,
         (select count(*)::text from information_schema.tables
           where table_schema = 'public' and table_name = 'bodyweight') as result,
         '1' as expected
  union all
  select 'it holds a date and a weight and nothing else',
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'bodyweight'), '3'
  union all
  select 'no goal weight column, and no body fat column',
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'bodyweight'
             and column_name not in ('id', 'date', 'weight')), '0'
  union all
  select 'the weight is numeric, not an integer',
         (select data_type from information_schema.columns
           where table_schema = 'public' and table_name = 'bodyweight'
             and column_name = 'weight'), 'numeric'
  union all
  select 'row level security is on',
         (select relrowsecurity::text from pg_class where relname = 'bodyweight'),
         'true'
  union all
  select 'signed in sees the weigh-in',
         current_setting('reign.bw_signed_in', true), '1'
  union all
  select 'signed out sees none',
         current_setting('reign.bw_signed_out', true), '0'
  union all
  select 'two readings on one day are refused',
         current_setting('reign.two_per_day', true), 'rejected'
  union all
  select 'but correcting the day''s reading works',
         current_setting('reign.correction', true), '186.00'
  union all
  select 'nobody weighs nothing',
         current_setting('reign.zero', true), 'rejected'
  union all
  select 'nor less than nothing',
         current_setting('reign.negative', true), 'rejected'
  union all
  select 'a weigh-in with no date is refused',
         current_setting('reign.no_date', true), 'rejected'
  union all
  select 'the decimal is kept, not rounded away',
         current_setting('reign.decimal', true), '185.40'
  union all
  select 'and four whole digits do not fit',
         current_setting('reign.too_big', true), 'rejected'
  union all
  select 'all sixteen tables are present',
         current_setting('reign.tables', true), '16'
  union all
  select 'the verification rows left nothing behind',
         current_setting('reign.left_over', true), '0'
)
select what, result, expected,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from checks;
