-- Proves 0007 did what it claims. Run it in the Supabase SQL editor after 0007.
--
-- One result set at the end, because the editor shows only the last statement's
-- output. Everything before it parks its answer in a setting.
--
-- This script writes a throwaway workout and cardio session, tries to break
-- what the schema should refuse, and deletes them again. It leaves nothing
-- behind, which the last check proves rather than assumes.

-- ---------------------------------------------------------------------------
-- Part one: the access rule on the settings row, as the roles themselves.
--
-- SET LOCAL outside a transaction is silently ignored, which would make these
-- pass on a completely unprotected table.
-- ---------------------------------------------------------------------------
begin;
set local role authenticated;
select set_config('reign.settings_signed_in',
  (select count(*)::text from app_settings), false);
set local role anon;
select set_config('reign.settings_signed_out',
  (select count(*)::text from app_settings), false);
reset role;
commit;

-- ---------------------------------------------------------------------------
-- Part two: prove the constraints bite.
-- ---------------------------------------------------------------------------

-- There is one owner, so there is one settings row, and a second is impossible.
do $$
begin
  insert into app_settings (id, health_shortcut_name) values (true, 'Second');
  perform set_config('reign.two_settings', 'ALLOWED', false);
  delete from app_settings where health_shortcut_name = 'Second';
exception when unique_violation then
  perform set_config('reign.two_settings', 'rejected', false);
end $$;

-- Including one that tries to sneak in as false.
do $$
begin
  insert into app_settings (id, health_shortcut_name) values (false, 'Sneaky');
  perform set_config('reign.false_row', 'ALLOWED', false);
  delete from app_settings where health_shortcut_name = 'Sneaky';
exception when check_violation then
  perform set_config('reign.false_row', 'rejected', false);
end $$;

-- A shortcut with no name builds a link that opens nothing.
do $$
begin
  update app_settings set health_shortcut_name = '   ';
  perform set_config('reign.blank_name', 'ALLOWED', false);
  update app_settings set health_shortcut_name = 'LogREIGN';
exception when check_violation then
  perform set_config('reign.blank_name', 'rejected', false);
end $$;

-- A cardio session cannot finish before it started.
do $$
begin
  insert into cardio_sessions (id, date, type, duration_min, started_at, finished_at)
  values ('00000000-0000-4000-8000-00000000c007', current_date, 'Cycling', 45,
          now(), now() - interval '1 hour');
  perform set_config('reign.backwards', 'ALLOWED', false);
  delete from cardio_sessions where id = '00000000-0000-4000-8000-00000000c007';
exception when check_violation then
  perform set_config('reign.backwards', 'rejected', false);
end $$;

-- ---------------------------------------------------------------------------
-- Part three: the columns behave, and nothing that existed changed meaning.
-- ---------------------------------------------------------------------------

-- A session recorded before this migration is not sent, which is a fact rather
-- than an unknown, so the column is false and not null.
insert into workouts (id, date, split_name, started_at, finished_at)
values ('00000000-0000-4000-8000-00000000b007', current_date, 'Verification',
        now() - interval '52 minutes', now());

select set_config('reign.default_unsent',
  (select sent_to_health::text from workouts
    where id = '00000000-0000-4000-8000-00000000b007'), false);

update workouts set sent_to_health = true
 where id = '00000000-0000-4000-8000-00000000b007';
select set_config('reign.can_mark',
  (select sent_to_health::text from workouts
    where id = '00000000-0000-4000-8000-00000000b007'), false);

-- And unmarked again, because the owner can be wrong about it too.
update workouts set sent_to_health = false
 where id = '00000000-0000-4000-8000-00000000b007';
select set_config('reign.can_unmark',
  (select sent_to_health::text from workouts
    where id = '00000000-0000-4000-8000-00000000b007'), false);

-- A cardio session carries the same three columns.
insert into cardio_sessions (id, date, type, duration_min, started_at, finished_at)
values ('00000000-0000-4000-8000-00000000c008', current_date, 'Cycling', 45,
        now() - interval '45 minutes', now());

select set_config('reign.cardio_span',
  (select round(extract(epoch from (finished_at - started_at)) / 60)::text
     from cardio_sessions where id = '00000000-0000-4000-8000-00000000c008'), false);

-- A session with no instants at all is still allowed, which is every ride
-- recorded before today.
do $$
begin
  insert into cardio_sessions (id, date, type, duration_min)
  values ('00000000-0000-4000-8000-00000000c009', current_date, 'Rowing', 20);
  perform set_config('reign.no_instants', 'allowed', false);
exception when others then
  perform set_config('reign.no_instants', 'REFUSED', false);
end $$;

delete from workouts where id = '00000000-0000-4000-8000-00000000b007';
delete from cardio_sessions
 where id in ('00000000-0000-4000-8000-00000000c008',
              '00000000-0000-4000-8000-00000000c009');

select set_config('reign.left_over',
  ((select count(*) from workouts where split_name = 'Verification')
   + (select count(*) from cardio_sessions
       where id in ('00000000-0000-4000-8000-00000000c008',
                    '00000000-0000-4000-8000-00000000c009')))::text, false);

-- Nothing else lost. Fifteen tables now.
select set_config('reign.tables',
  (select count(*)::text from information_schema.tables
    where table_schema = 'public'
      and table_name in ('exercises','splits','workouts','workout_exercises',
                         'sets','exercise_targets','cardio_sessions',
                         'hidden_exercises','programs','program_days',
                         'program_exercises','exercise_alternates',
                         'program_day_cardio','program_stability_items',
                         'app_settings')), false);

-- ---------------------------------------------------------------------------
-- Part four: the report.
-- ---------------------------------------------------------------------------
with checks as (
  select 'a workout can record that it reached Health' as what,
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'workouts'
             and column_name = 'sent_to_health') as result,
         '1' as expected
  union all
  select 'so can a cardio session',
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'cardio_sessions'
             and column_name = 'sent_to_health'), '1'
  union all
  select 'and a cardio session knows when it ran',
         (select count(*)::text from information_schema.columns
           where table_schema = 'public' and table_name = 'cardio_sessions'
             and column_name in ('started_at', 'finished_at')), '2'
  union all
  select 'the settings table exists',
         (select count(*)::text from information_schema.tables
           where table_schema = 'public' and table_name = 'app_settings'), '1'
  union all
  select 'with exactly one row in it',
         (select count(*)::text from app_settings), '1'
  union all
  select 'defaulting to LogREIGN',
         (select health_shortcut_name from app_settings), 'LogREIGN'
  union all
  select 'row level security is on for it',
         (select relrowsecurity::text from pg_class where relname = 'app_settings'), 'true'
  union all
  select 'signed in sees the settings',
         current_setting('reign.settings_signed_in', true), '1'
  union all
  select 'signed out sees none',
         current_setting('reign.settings_signed_out', true), '0'
  union all
  select 'a second settings row is impossible',
         current_setting('reign.two_settings', true), 'rejected'
  union all
  select 'including one pretending to be false',
         current_setting('reign.false_row', true), 'rejected'
  union all
  select 'a shortcut with no name is refused',
         current_setting('reign.blank_name', true), 'rejected'
  union all
  select 'a session cannot finish before it started',
         current_setting('reign.backwards', true), 'rejected'
  union all
  select 'a new session starts unsent, as a fact rather than an unknown',
         current_setting('reign.default_unsent', true), 'false'
  union all
  select 'it can be marked as sent',
         current_setting('reign.can_mark', true), 'true'
  union all
  select 'and unmarked again, because the owner can be wrong too',
         current_setting('reign.can_unmark', true), 'false'
  union all
  select 'a ride stores the 45 minutes it actually took',
         current_setting('reign.cardio_span', true), '45'
  union all
  select 'a session with no instants is still allowed',
         current_setting('reign.no_instants', true), 'allowed'
  union all
  select 'all fifteen tables are present',
         current_setting('reign.tables', true), '15'
  union all
  select 'the verification rows left nothing behind',
         current_setting('reign.left_over', true), '0'
)
select what, result, expected,
       case when result = expected then 'PASS' else 'FAIL' end as verdict
from checks;
