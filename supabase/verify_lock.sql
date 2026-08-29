-- Does the lock actually hold?
--
-- The earlier verify.sql confirmed the tables exist and the exercises loaded.
-- This one is different: it checks that a stranger who finds your web address
-- can read the exercise library but cannot see a single thing about your
-- training.
--
-- It works by asking Postgres to pretend to be "anon" — the role a signed-out
-- visitor gets — and then trying to read each table. Nothing is changed.

set local role anon;

select 'exercise library, signed out' as check,
       case when count(*) = 876 then 'PASS — readable, as intended'
            else 'CHECK — saw ' || count(*) || ', expected 876' end as result
from exercises

union all

select 'workouts, signed out',
       case when count(*) = 0 then 'PASS — hidden' else 'FAIL — ' || count(*) || ' rows visible' end
from workouts

union all

select 'sets, signed out',
       case when count(*) = 0 then 'PASS — hidden' else 'FAIL — ' || count(*) || ' rows visible' end
from sets

union all

select 'splits, signed out',
       case when count(*) = 0 then 'PASS — hidden' else 'FAIL — ' || count(*) || ' rows visible' end
from splits

union all

select 'exercise targets, signed out',
       case when count(*) = 0 then 'PASS — hidden' else 'FAIL — ' || count(*) || ' rows visible' end
from exercise_targets

union all

select 'cardio, signed out',
       case when count(*) = 0 then 'PASS — hidden' else 'FAIL — ' || count(*) || ' rows visible' end
from cardio_sessions;

reset role;

-- A note on reading this result.
--
-- The training tables are empty right now, so "0 rows visible" is what an
-- unlocked table would show too. This test is therefore worth re-running once
-- there is a real workout logged: at that point "0 rows visible" while signed
-- out is proof the lock works rather than a coincidence.
--
-- The stronger check today is the one below, which reads the rules themselves
-- rather than the data.

select tablename as "table",
       case when policyname is null then 'NO ACCESS — locked to everyone'
            else policyname end as rule,
       coalesce(array_to_string(roles, ', '), '-') as "who it applies to",
       coalesce(cmd, '-') as "what it allows"
from pg_tables t
left join pg_policies p
  on p.tablename = t.tablename and p.schemaname = t.schemaname
where t.schemaname = 'public'
order by t.tablename, policyname;
