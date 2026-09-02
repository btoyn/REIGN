-- REIGN: sending a finished session to Apple Health.
--
-- Run this AFTER 0006_program_shape.sql.
--
-- WHAT THIS IS NOT. There is no HealthKit here and there cannot be. HealthKit
-- is a native iOS framework with no browser API, and REIGN is a web page on a
-- home screen. Nothing in this migration, and nothing in the code that reads
-- it, writes to Health.
--
-- What the app can do is hand the data to a Shortcut the owner builds on their
-- own phone, through a shortcuts:// link, and the Shortcut writes to Health.
-- That makes the export a thing that leaves REIGN and may or may not arrive:
-- iOS opens the link and tells the page nothing about what happened next. A
-- deep link that silently fails is indistinguishable from one that worked.
--
-- Which is the whole reason these columns exist. If the app could know the
-- export succeeded it would not need to store whether it did.

-- ---------------------------------------------------------------------------
-- Whether a session has been sent
-- ---------------------------------------------------------------------------
-- Set by hand, by the owner, after they have seen it land in Health. Never set
-- by the app on its own: tapping the button is not evidence of anything, and a
-- flag the app sets optimistically would quietly turn "I sent this" into "I
-- pressed a button once".
--
-- Default false rather than nullable. Every session that existed before this
-- migration has genuinely not been sent, which is a fact rather than an unknown.
alter table workouts
  add column if not exists sent_to_health boolean not null default false;

alter table cardio_sessions
  add column if not exists sent_to_health boolean not null default false;

-- ---------------------------------------------------------------------------
-- When a cardio session actually happened
-- ---------------------------------------------------------------------------
-- A workout already knows: it is a row from the moment START WORKOUT is pressed
-- and it records started_at and finished_at as they happen. Health wants the
-- same two instants for a ride, and cardio_sessions held only a date and a
-- number of minutes, because it is typed in from the machine's display after
-- the fact.
--
-- So the end is recorded at the moment the session is logged and the start is
-- the entered duration before it. Both are stored rather than worked out at
-- read time, because "duration before now" would give a different answer every
-- time the screen was opened.
--
-- This is an honest approximation and the screen says so rather than hiding it:
-- log the ride an hour later and the times will be an hour late. The fallback
-- block shows exactly what will be sent, so a wrong time is visible before it
-- is exported rather than after.
--
-- Nullable, because every session recorded before today has no such instants
-- and inventing them would be worse than admitting there are none.
alter table cardio_sessions add column if not exists started_at timestamptz;
alter table cardio_sessions add column if not exists finished_at timestamptz;

alter table cardio_sessions drop constraint if exists cardio_sessions_span_check;
alter table cardio_sessions add constraint cardio_sessions_span_check
  check (finished_at is null or started_at is null or finished_at >= started_at);

comment on column cardio_sessions.started_at is
  'Derived at log time from the entered duration. Null for sessions recorded before the Health export existed.';

-- ---------------------------------------------------------------------------
-- app_settings — the one row of settings there is
-- ---------------------------------------------------------------------------
-- The name of the Shortcut to call. It has a sensible default and almost
-- certainly never changes, but the link is useless if it is wrong and the owner
-- is the only person who knows what they named it.
--
-- Stored rather than kept in the browser. localStorage would be per device and
-- would vanish with the site data, and CLAUDE.md's rule is direct Supabase
-- reads and writes with no offline layer.
--
-- A single row, enforced by the schema rather than by hoping. The primary key
-- is a boolean that must be true, so a second row is impossible: there is one
-- owner and one set of settings, and a table that can hold two is a table that
-- will eventually be read with .limit(1) and answer differently on a Tuesday.
create table if not exists app_settings (
  id boolean primary key default true check (id),

  -- What the Shortcut is called on the owner's phone. The link addresses it by
  -- name, because that is the only handle iOS gives.
  health_shortcut_name text not null default 'LogREIGN'
    check (length(trim(health_shortcut_name)) > 0)
);

insert into app_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Access. Signed in only, like everything else the owner owns.
-- ---------------------------------------------------------------------------
alter table app_settings enable row level security;

drop policy if exists "Owner manages settings" on app_settings;
create policy "Owner manages settings"
  on app_settings for all
  to authenticated
  using (true) with check (true);
