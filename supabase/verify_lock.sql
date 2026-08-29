-- Does the lock actually hold?
--
-- Run the two queries below. They can be run together or one at a time.
--
-- Nothing is kept. The second one writes a fake workout, checks who can see
-- it, then undoes the write.

-- ---------------------------------------------------------------------------
-- 1. The rules
-- ---------------------------------------------------------------------------
-- Expect exercises to allow SELECT to anon and authenticated, and every other
-- table to allow ALL to authenticated only.
select tablename,
       policyname,
       array_to_string(roles, ', ') as applies_to,
       cmd
from pg_policies
where schemaname = 'public'
order by tablename;

-- ---------------------------------------------------------------------------
-- 2. The live proof
-- ---------------------------------------------------------------------------
-- Expect: signed out sees 0 workouts, signed in sees 1, signed out sees 876
-- exercises.
begin;

insert into workouts (date, split_name) values (current_date, 'LOCK TEST');

set local role anon;
select 'signed out, your workouts' as check, count(*) as number from workouts;

reset role;
set local role authenticated;
select 'signed in, your workouts' as check, count(*) as number from workouts;

reset role;
set local role anon;
select 'signed out, exercise library' as check, count(*) as number from exercises;

reset role;
rollback;
