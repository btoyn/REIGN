-- Load the exercise library.
--
-- Run this AFTER 0001_initial_schema.sql and 0002_access_policies.sql.
--
-- Source: the Free Exercise DB, https://github.com/yuhonas/free-exercise-db
-- Public domain under the Unlicense. 876 exercises, tagged by primary muscle
-- (including lats, traps, middle back and lower back) and by equipment.
--
-- The database fetches the file itself, so nothing has to be uploaded and no
-- credentials are needed. Safe to run more than once: rows already present are
-- skipped rather than duplicated.
--
-- Two shaping notes:
--
--   The source records a list of primary muscles. 875 of the 876 have exactly
--   one. The single exception has two, so the first becomes primary_muscle and
--   any beyond the first join secondary_muscles rather than being discarded.
--
--   Instruction order matters when reading how to perform a lift, so the
--   instructions array is rebuilt in its original order rather than whatever
--   order the rows happen to come back in.

create extension if not exists http with schema extensions;

with source as (
  select (
    extensions.http_get(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
    )
  ).content::jsonb as doc
)
insert into exercises (
  id, name, primary_muscle, secondary_muscles, equipment, category, instructions
)
select
  e ->> 'id',
  e ->> 'name',
  e -> 'primaryMuscles' ->> 0,
  (
    select coalesce(array_agg(distinct m), '{}')
    from (
      select jsonb_array_elements_text(e -> 'secondaryMuscles') as m
      union all
      select m from (
        select jsonb_array_elements_text(e -> 'primaryMuscles') as m offset 1
      ) extra_primary
    ) muscles
  ),
  e ->> 'equipment',
  e ->> 'category',
  (
    select coalesce(array_agg(step order by ord), '{}')
    from jsonb_array_elements_text(e -> 'instructions') with ordinality as t(step, ord)
  )
from source, lateral jsonb_array_elements(source.doc) as e
on conflict (id) do nothing;
