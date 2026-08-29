-- Does the lock actually hold?
--
-- verify.sql confirmed the tables exist and the exercises loaded. This one
-- checks the different claim: that someone who finds your web address can read
-- the exercise library but cannot see anything about your training.
--
-- Nothing here is permanent. Part three writes a fake workout, checks who can
-- see it, then undoes the write.

-- ---------------------------------------------------------------------------
-- Part 1 — what the rules say
-- ---------------------------------------------------------------------------
-- "signed out" is the anon role. "signed in" is authenticated.
select
  t.tablename                                    as "table",
  case when p.policyname is null
       then 'NO RULE — nobody can reach it'
       else p.policyname end                     as rule,
  coalesce(array_to_string(p.roles, ', '), '-')  as "applies to",
  coalesce(p.cmd, '-')                           as allows
from pg_tables t
left join pg_policies p
  on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public'
order by t.tablename, p.policyname;

-- ---------------------------------------------------------------------------
-- Part 2 — can a signed-out visitor even reach each table?
-- ---------------------------------------------------------------------------
-- Policies decide which rows are visible, but a separate permission decides
-- whether the table can be touched at all. Both have to line up, so both are
-- worth checking.
--
-- Expect "yes" on every row here, including workouts. That is correct and is
-- not a hole: this column only says the table can be addressed at all. Which
-- rows come back is decided by the rules in Part 1, and Part 3 proves it.
select
  tablename as "table",
  case when has_table_privilege('anon', 'public.' || tablename, 'SELECT')
       then 'yes' else 'no' end as "reachable signed out",
  case when has_table_privilege('authenticated', 'public.' || tablename, 'SELECT')
       then 'yes' else 'no' end as "reachable signed in"
from pg_tables
where schemaname = 'public'
order by tablename;

-- ---------------------------------------------------------------------------
-- Part 3 — the live proof
-- ---------------------------------------------------------------------------
-- A fake workout is written, then read back as a signed-out visitor and as a
-- signed-in account. The rollback at the end throws the fake workout away, so
-- nothing is left behind either way.
--
-- This matters because while your training tables are empty, "nothing visible"
-- proves nothing: an unlocked empty table looks identical. Writing one row
-- first is what makes the answer meaningful.
begin;

insert into workouts (date, split_name, notes)
values (current_date, 'LOCK TEST — not a real workout', 'deleted automatically');

set local role anon;
select 'signed out, with a workout in the table' as check,
       case when count(*) = 0
            then 'PASS — hidden'
            else 'FAIL — ' || count(*) || ' visible to the public' end as result
from workouts;

reset role;
set local role authenticated;
select 'signed in, same workout' as check,
       case when count(*) = 1
            then 'PASS — visible to you'
            else 'FAIL — you cannot see your own data' end as result
from workouts;

reset role;
set local role anon;
select 'signed out, exercise library' as check,
       case when count(*) = 876
            then 'PASS — readable, as intended'
            else 'CHECK — saw ' || count(*) || ', expected 876' end as result
from exercises;

reset role;
rollback;

-- Confirm the fake workout is gone.
select 'fake workout cleaned up' as check,
       case when count(*) = 0 then 'PASS — nothing left behind'
            else 'CHECK — ' || count(*) || ' rows remain' end as result
from workouts;
