-- REIGN initial schema.
--
-- The seven tables from docs/REIGN_BUILD_PLAN.md, "Data model".
-- Locked before any screen is built against them.
--
-- Two rules from CLAUDE.md are enforced structurally here:
--   * numbers are stored as numbers, never as formatted display strings
--   * personal records are calculated from sets, never stored
--
-- Row level security is enabled on every table with no policies attached, so
-- nothing can be read or written until an access decision is made. This fails
-- closed on purpose. Policies arrive with the authentication decision.

-- ---------------------------------------------------------------------------
-- exercises — loaded once from the Free Exercise DB (public domain, Unlicense)
-- ---------------------------------------------------------------------------
-- The primary key is the source's own stable slug, e.g. 'Barbell_Bench_Press'.
-- Reusing it keeps the load idempotent and lets the data be refreshed without
-- breaking rows that reference an exercise.
create table exercises (
  id                 text primary key,
  name               text not null unique,
  primary_muscle     text not null,
  secondary_muscles  text[] not null default '{}',
  equipment          text,
  category           text not null,
  instructions       text[] not null default '{}'
);

comment on column exercises.equipment is
  'Nullable. 77 of the 876 source records carry no equipment value.';

create index exercises_primary_muscle_idx on exercises (primary_muscle);

-- ---------------------------------------------------------------------------
-- splits — the weekday plan. Monday is back, and so on.
-- ---------------------------------------------------------------------------
-- day_of_week follows PostgreSQL's own convention: 0 is Sunday, 6 is Saturday.
create table splits (
  id              uuid primary key default gen_random_uuid(),
  day_of_week     smallint not null unique check (day_of_week between 0 and 6),
  name            text not null,
  target_muscles  text[] not null default '{}'
);

-- ---------------------------------------------------------------------------
-- workouts
-- ---------------------------------------------------------------------------
-- split_name is captured on the workout rather than referenced, so renaming a
-- split later does not rewrite training history.
create table workouts (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  split_name   text,
  started_at   timestamptz,
  finished_at  timestamptz,
  notes        text,
  check (finished_at is null or started_at is null or finished_at >= started_at)
);

create index workouts_date_idx on workouts (date desc);

-- ---------------------------------------------------------------------------
-- workout_exercises — which exercises a workout contained, in order
-- ---------------------------------------------------------------------------
create table workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references workouts (id) on delete cascade,
  exercise_id  text not null references exercises (id),
  position     integer not null check (position >= 0),
  unique (workout_id, position)
);

create index workout_exercises_workout_id_idx on workout_exercises (workout_id);
create index workout_exercises_exercise_id_idx on workout_exercises (exercise_id);

-- ---------------------------------------------------------------------------
-- sets — the actual record. Everything else exists to give these context.
-- ---------------------------------------------------------------------------
create table sets (
  id                   uuid primary key default gen_random_uuid(),
  workout_exercise_id  uuid not null references workout_exercises (id) on delete cascade,
  set_number           integer not null check (set_number >= 1),
  weight               numeric(6, 2) check (weight >= 0),
  reps                 integer check (reps >= 0),
  is_warmup            boolean not null default false,
  completed_at         timestamptz,
  unique (workout_exercise_id, set_number)
);

create index sets_workout_exercise_id_idx on sets (workout_exercise_id);

-- ---------------------------------------------------------------------------
-- exercise_targets — rep range and current working weight, per exercise
-- ---------------------------------------------------------------------------
-- One row per exercise. This is what the double progression rule reads and
-- updates.
create table exercise_targets (
  id               uuid primary key default gen_random_uuid(),
  exercise_id      text not null unique references exercises (id) on delete cascade,
  target_rep_min   integer not null check (target_rep_min >= 1),
  target_rep_max   integer not null check (target_rep_max >= 1),
  current_weight   numeric(6, 2) check (current_weight >= 0),
  check (target_rep_max >= target_rep_min)
);

-- ---------------------------------------------------------------------------
-- cardio_sessions — manual entry. No Apple Health on the web.
-- ---------------------------------------------------------------------------
create table cardio_sessions (
  id            uuid primary key default gen_random_uuid(),
  date          date not null,
  type          text not null,
  duration_min  integer check (duration_min >= 0),
  avg_hr        integer check (avg_hr >= 0),
  max_hr        integer check (max_hr >= 0),
  calories      integer check (calories >= 0),
  distance      numeric(8, 2) check (distance >= 0)
);

create index cardio_sessions_date_idx on cardio_sessions (date desc);

-- ---------------------------------------------------------------------------
-- Row level security: on everywhere, no policies yet. Denies by default.
-- ---------------------------------------------------------------------------
alter table exercises          enable row level security;
alter table splits             enable row level security;
alter table workouts           enable row level security;
alter table workout_exercises  enable row level security;
alter table sets               enable row level security;
alter table exercise_targets   enable row level security;
alter table cardio_sessions    enable row level security;
