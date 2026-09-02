-- REIGN: bodyweight.
--
-- Run this AFTER 0007_health_export.sql.
--
-- Asked for by the owner. It earns its place for a reason worth stating: the
-- Longevity 6 standing notes set a benchmark of "a farmer carry at bodyweight
-- total, half in each hand", and REIGN could not tell them what that number
-- was. A training log that holds every weight on the bar and not the weight of
-- the person lifting it is missing the one figure several other numbers are
-- measured against.
--
-- ONE ROW PER DAY, enforced rather than hoped: date is unique. Stepping on the
-- scales twice on a Tuesday is one weigh-in that got corrected, not two
-- readings to average. Re-entering replaces.
--
-- Pounds, like every other weight in REIGN. There is no unit setting and
-- inventing one before it is asked for would be a feature nobody requested.

create table if not exists bodyweight (
  id      uuid primary key default gen_random_uuid(),

  -- The day it was recorded, not a timestamp. A weigh-in is a day's reading;
  -- the minute it happened carries nothing and would make "one per day"
  -- impossible to enforce.
  date    date not null unique,

  -- numeric rather than integer, because scales report a decimal and rounding
  -- it away at write time would throw away the only part of a weekly change
  -- that is visible.
  weight  numeric(5, 2) not null check (weight > 0)
);

-- Read newest first, always: the current weight heads the block and the trend
-- runs backwards from it.
create index if not exists bodyweight_date_idx on bodyweight (date desc);

-- ---------------------------------------------------------------------------
-- Access. The owner's own record, so signed in only, like everything else that
-- is not the public exercise library.
-- ---------------------------------------------------------------------------
alter table bodyweight enable row level security;

drop policy if exists "Owner manages bodyweight" on bodyweight;
create policy "Owner manages bodyweight"
  on bodyweight for all
  to authenticated
  using (true) with check (true);
