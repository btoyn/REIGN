-- REIGN: what makes a good substitute.
--
-- Run this AFTER 0004_programs.sql.
--
-- Swapping an exercise already works from the tags the library carries: same
-- primary muscle, different equipment first, shared secondary muscles as the
-- measure of closeness. It works, and it is not good enough, for two reasons
-- this migration fixes.
--
-- FIRST, MECHANIC WAS NEVER LOADED. The owner asked for substitutes matched on
-- primary muscle and mechanic — compound against isolation — on the reasonable
-- belief that both were already tagged. Primary muscle, secondary muscles and
-- equipment are in the table. Mechanic is in the source data and was simply
-- never carried across. Without it a bench press can suggest a fly.
--
-- SECOND, THE TAGS ARE NOT ENOUGH ON THEIR OWN, which the owner said before any
-- of this was built: "the tags won't always match real judgment". They were
-- right, and it is worth recording exactly how. Asked for a substitute for the
-- barbell bench press, the tag ranking's first answer is Bent-Arm Dumbbell
-- Pullover: same primary muscle, different equipment, and it shares both
-- secondary muscles. By the tags it is a perfect match. It is not a bench
-- press. No amount of ranking fixes that, because the tags genuinely do not
-- distinguish them, so the owner gets to overrule it.

-- ---------------------------------------------------------------------------
-- exercises.mechanic — compound or isolation
-- ---------------------------------------------------------------------------
-- A column on the library table rather than a new one beside it. The library is
-- public-domain reference data loaded from one source, and this is one more
-- field of that same source; storing it anywhere else would mean joining a
-- table to answer a question about a row that already exists.
--
-- Nullable, because 87 of the 876 source records carry no mechanic. A
-- substitute rule reading this must treat null as "unknown" rather than as a
-- category, or those 87 would silently become a class of their own.
alter table exercises add column if not exists mechanic text;

comment on column exercises.mechanic is
  'Nullable. 87 of the 876 source records carry no mechanic value.';

-- Two values or nothing. Anything else is a loading mistake, and a constraint
-- is how it gets caught at the moment it happens rather than in a ranking six
-- months later.
alter table exercises drop constraint if exists exercises_mechanic_check;
alter table exercises add constraint exercises_mechanic_check
  check (mechanic is null or mechanic in ('compound', 'isolation'));

-- Backfill from the same source the library was loaded from, fetched by the
-- database itself exactly as supabase/seed/load_exercises.sql does, so nothing
-- has to be uploaded. Safe to run more than once: it sets the same values again.
create extension if not exists http with schema extensions;

with source as (
  select (
    extensions.http_get(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
    )
  ).content::jsonb as doc
),
tagged as (
  select x ->> 'id' as id, x ->> 'mechanic' as mechanic
  from source, lateral jsonb_array_elements(source.doc) as x
)
update exercises e
set mechanic = tagged.mechanic
from tagged
where e.id = tagged.id
  and tagged.mechanic is not null;

-- ---------------------------------------------------------------------------
-- exercise_alternates — the owner's own judgement, which beats any tag
-- ---------------------------------------------------------------------------
create table if not exists exercise_alternates (
  exercise_id   text not null references exercises (id) on delete cascade,
  alternate_id  text not null references exercises (id) on delete cascade,

  -- The order the pins are offered in. Storage order for a short list, never
  -- shown as a number.
  position      integer not null default 0 check (position >= 0),

  -- The pair is the key: two exercises are either pinned to each other or they
  -- are not, and pinning twice is not a thing.
  primary key (exercise_id, alternate_id),

  -- Nothing is its own alternative.
  constraint exercise_alternates_not_itself check (exercise_id <> alternate_id)
);

-- Pinning is read in both directions: a row saying A can be swapped for B also
-- answers "what can I do instead of B". That is how a lifter thinks about it —
-- the two are interchangeable, not one subordinate to the other — and it means
-- the owner pins a pair once rather than twice. This index makes the reverse
-- read as cheap as the forward one.
create index if not exists exercise_alternates_alternate_id_idx
  on exercise_alternates (alternate_id);

-- ---------------------------------------------------------------------------
-- Access. The library stays public reference data; the owner's pins do not.
--
-- exercises keeps the read policy 0002 gave it, and mechanic is just another
-- column of it. exercise_alternates is a judgement the owner made, so it is
-- signed in only like the rest of their data.
-- ---------------------------------------------------------------------------
alter table exercise_alternates enable row level security;

drop policy if exists "Owner manages exercise alternates" on exercise_alternates;
create policy "Owner manages exercise alternates"
  on exercise_alternates for all
  to authenticated
  using (true) with check (true);
