# REIGN UI Specification

## Purpose

This document is the visual and interaction source of truth for REIGN.

Claude should implement this specification faithfully and should not independently redesign the app.

---

## Brand Direction

REIGN should feel:

- premium
- strong
- restrained
- calm
- capable
- masculine without being extreme
- modern
- highly legible during a workout

The app should not feel like:

- a bodybuilding website
- a social fitness network
- a gamified fitness app
- a neon gym app
- an analytics dashboard
- a generic AI-generated fitness interface

---

## Color System

REIGN is dark-only.

Use these initial design tokens:

- `bg`: `#0A0A0A`
- `surface`: `#141414`
- `surfaceRaised`: `#1C1C1C`
- `textPrimary`: `#F4F1EA`
- `textSecondary`: `#A7A39A`
- `border`: `#292929`
- `accent`: `#C6A15B`
- `accentPressed`: `#AE8948`

Gold should be used sparingly.

Gold is appropriate for:

- primary CTA
- selected navigation state
- completed set checkmarks
- PR indicators
- important progress states
- occasional key emphasis

Do not use gold as a large background treatment.

Do not introduce additional brand colors without approval.

---

## Typography

The typeface is **Archivo**.

The earlier rule here called for the native system font. That rule is what made
REIGN look like any other app, and it is withdrawn.

Two widths are in use, from the same family, so the interface stays one voice:

- **Archivo Condensed** for headings and large numbers. Condensed carries weight
  at large sizes without eating the width of a phone, which matters because the
  things that need to be big here are words like DEADLIFT and numbers like 315.
- **Archivo regular width** for body text, labels and anything read as a
  sentence.

### Numbers

Tabular figures are on across the whole interface.

This is not a preference. A training log is columns of weights and reps, and
proportional digits make a column of 45, 135 and 315 ragged and slow to scan.
Every digit occupies the same width so columns line up.

Verified rather than assumed: Archivo's digits are proportional by default and
its tabular feature maps every digit to one width, in both the condensed and
regular widths, at 400 and 700 weight.

### Hierarchy

**Display** — condensed, large, bold. Major metrics and the split name on Today.
Used sparingly; if everything is display, nothing is.

**Screen title** — small, uppercase, letterspaced, muted. An eyebrow that names
the screen without competing with its content.

**Primary content** — the thing the screen is about. DEADLIFT. Bigger Leaner
Stronger. Condensed at the largest sizes, regular below.

**Secondary content** — Monday · Back. Yesterday · 49 min. Recedes.

Uppercase is for small section labels and primary buttons. Do not uppercase all
interface text.

---

## Spacing

Use a simple 4-point spacing system.

Preferred values:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40

Default horizontal screen padding should be approximately 20–24 points.

The interface should feel open without wasting space.

Avoid stacking many unrelated cards with large gaps.

---

## Surfaces

Use flat dark surfaces.

Cards should only exist when they improve information grouping.

Preferred card treatment:

- charcoal surface
- subtle border if needed
- restrained corner radius
- no shadows unless barely perceptible
- no gradients unless explicitly approved

Avoid turning every section into a card.

---

## Corner Radius

Keep radii moderate.

Suggested values:

- small: 8
- medium: 12
- large: 16

Primary buttons may use 12–16.

Do not use exaggerated pill shapes throughout the app.

---

## Dividers

Use subtle dividers to organize information.

Preferred divider color:

`#292929`

Thin lines are preferred over excessive container boxes.

---

## Icons

Use icons only when they improve comprehension.

Do not decorate the interface with unnecessary icons.

Use simple system-style icons when needed. Lucide is the icon set.

Do not use emoji as interface icons.

---

## Brand Assets

Approved assets live in:

`assets/brand/`

Use the supplied REIGN logo files.

Do not recreate or reinterpret the lion.

The detailed lion should primarily appear in high-impact brand moments such as:

- app icon
- splash
- onboarding
- major milestones
- selected brand moments

Do not place the lion on every screen.

The workout interface should prioritize function over branding.

---

# Navigation

Primary navigation has four tabs:

1. Today
2. Program
3. Progress
4. You

The tab bar should:

- use the dark app background or dark charcoal
- remain visually quiet
- use muted text/icons for inactive tabs
- use restrained gold for the active tab
- avoid oversized icons
- avoid floating navigation treatments
- avoid gradients

---

# Today Screen

## Goal

The Today screen answers one question immediately:

**What am I doing today?**

It should not attempt to summarize the entire app.

---

## The governing principle

The owner trains the same thing every Monday. He should not have to make a
decision to start training. The app already knows, and improvising is one tap
away but never in the way.

**Two equal buttons on Today would be a decision tax on every workout.** There
is one primary action and one quiet escape, never a pair.

---

## Information Hierarchy

Top area, on every state:

- the REIGN wordmark
- current date

Then a single block whose content depends on the state below, then the primary
action, then a quiet text link, `Change today`, which reopens the six regions so
the day's focus can be corrected.

`Change today` replaces the earlier `Something else`. That label described a
gesture rather than a decision, and it read as "add an exercise" instead of
"the plan is wrong today". Same verb as the permanent change in Program, with
the object naming the scope.

`LAST WORKOUT` sits beneath all of it once there is history. `CARDIO` arrives
with manual entry.

---

## Today's states

Today is one of five things. It is never a generic screen with a button on it.

### Split unknown

The first time a given weekday is seen. Today asks, once:

`What are you training today?`

Six body regions, plus `Rest day`. Choosing one records that weekday's split and
proceeds. **The split assembles itself over the first week of training, one
question per new weekday.** There is no setup wizard, and the app never asks
about a day the owner has not reached yet.

### Ready

- `BACK` — the split name, display size
- the program or split name beneath it
- `START WORKOUT`
- `Change today`

### In progress

A workout exists with no finish time. The app must never offer to start a second
one.

- `BACK`
- `In progress · 2 exercises · 5 sets`
- `RESUME WORKOUT`
- `Discard workout`, quiet, and **behind a confirmation step**. One mis-tap
  mid-session must not destroy a workout.

### Done today

- `BACK`
- `Finished · 52 min · 18 sets`
- No primary button. `Change today` becomes the only action.

### Rest day

- `Rest day`
- No primary button. `Change today` only.

---

## Where "what's next" comes from

From the weekday split. Programs are a later milestone and Today does not read
from them yet, because the data model has no concept of an activated program and
locking that model matters more than the feature does.

When programs arrive, they take precedence over the split, and this section is
revised then rather than anticipated now.

---

## Changing today, and changing the weekday

Two different actions. They differ only in scope, so the interface says so:

- **`Change today`** — chest is right for Mondays, wrong for this Monday.
- **Changing Mondays** — chest is no longer what Mondays are.

Same verb, different object. Nothing else needs explaining.

### Change today lives on Today

A quiet text link under the split name. It reopens the six regions plus
`Rest day`, the same choice the weekday was first answered with. Picking one
proceeds as that region.

It sits where the wrong answer is visible, and it is the urgent case, since the
owner is standing in the gym. It is a link and not a button so `START WORKOUT`
stays the only dominant action.

**The override is not stored.** `workouts.split_name` is a copy rather than a
reference, so a workout started after the override records `Back` while the
split row still says `Chest`. The deviation is recorded by the workout it
produced, and there is nothing else to keep.

**Consequence, stated so it is not mistaken for a bug: before a workout exists,
`Change today` does not survive a reload.** Nothing has happened yet, so there
is nothing to remember, and tomorrow is a different day. This is why
`Change today` ships with the workout engine and not before it — until a workout
can be created, the control would change a heading and forget.

### Changing the weekday lives in Program

The seven weekdays and what each one is. Days not yet reached are shown as
unanswered rather than left blank. Changing one is permanent, and is the same
write Today does when it first learns a day.

It belongs there because it is the whole schedule rather than one day, it is a
considered edit made rarely, and `program schedule` is already in Program
Direction below.

**Today does not prompt after a one-off change.** Offering "Mondays are still
chest, change that?" would turn a rare correction into a recurring question.
The tab is one tap away.

---

# Program — the weekday schedule

The first real content in the Program tab. Browsable programs remain a later
milestone; this is the split, which is what Today actually reads.

## Why it exists now

Today writes the split and cannot edit it. A value the app can write but not
correct is a broken feature, not a lean one — reaching the choice again meant
deleting a database row.

## The screen

Seven rows, Monday first, because the training week starts on Monday even though
the database counts from Sunday.

Each row carries the weekday and its split name. A day that has never been
answered says so plainly rather than showing an empty space that reads as a
failed load.

`Rest day` is settable here, not only in Today's first question. A weekday split
has rest days in it and the schedule cannot be honest without them.

The screen has no primary action. It is a list of seven things, all equal, and
promoting any one of them would be a lie about which day matters.

## What it must handle

Loading, error, and the case where no day has been answered yet. There is no
empty state beyond that: the seven weekdays always exist, answered or not.

---

## Today Screen Rules

Do not add:

- calorie rings
- body diagrams
- motivational quotes
- giant streak cards
- exercise list previews
- nutrition
- readiness score
- sleep score
- recovery score
- social activity
- leaderboard
- arbitrary analytics
- decorative graphs
- AI recommendations

The Today screen should remain sparse.

---

# Exercise Picker

The picker is reached from `Add exercise` during a workout, from
`Change today` on Today, and when choosing what to train on a new weekday.

## Order on the screen

1. **Search** — the primary entry point, at the top. Most of the time the owner
   knows the exercise's name and typing three letters is faster than any
   hierarchy.
2. **Recent** — the last exercises logged, most recent first.
3. **Frequent** — the most logged.
4. **Browse** — six body regions, muscles nested underneath.

Recent and Frequent are absent on day one because they would be empty and an
empty list is worse than no list. They appear as history accumulates, and once
they exist they carry most of the traffic.

## Six regions

Muscles nest under regions. Lats and traps sit **under** Back, not beside it.
Neck, abductors and adductors are nested and never top level.

| Region | Muscles |
|---|---|
| Chest | chest |
| Back | lats, middle back, lower back, traps |
| Shoulders | shoulders, neck |
| Arms | biceps, triceps, forearms |
| Legs | quadriceps, hamstrings, glutes, calves, abductors, adductors |
| Core | abdominals |

This covers all seventeen muscles the exercise library tags.

---

# Active Workout Direction

This is not part of the current milestone, but future implementation should follow these principles.

The workout screen prioritizes speed.

Each exercise should eventually show:

- exercise name
- prescribed sets and rep range
- previous workout values
- current weight
- current reps
- completed set state
- rest timer
- next target

Previous performance should be highly visible.

Logging should require as few taps as reasonably possible.

Completed sets may use the gold accent.

Do not prioritize branding over usability during a workout.

---

# Program Direction

Program structure should eventually support:

- proven programs
- custom-built workouts
- program schedule
- progression rules
- exercise substitutions

Program browsing should be curated and understandable.

Do not create a giant community marketplace.

Reference competitive program screens only for information architecture, not branding.

---

# Progress Direction

Progress should eventually emphasize:

- workout calendar
- consistency
- PRs
- exercise history
- strength trend
- cardio history

Metrics should be presented simply.

Avoid analytics overload.

Large numbers with restrained supporting labels are preferred over dense dashboards.

---

# Cardio Direction

REIGN does not need to duplicate Apple Watch workout tracking.

Apple Watch / Apple Health should eventually provide cardio data.

Primary use case:

- indoor cycling

Likely useful metrics:

- duration
- average heart rate
- max heart rate
- active calories
- distance when available

Cardio and strength should appear as part of the same training day.

---

# Reference Images

Reference images will live in:

`docs/design/references/`

Each reference should be used only for the specific design qualities described below.

## Hevy References

Use Hevy references for:

- spacing
- information hierarchy
- workout logging density
- large tap targets
- previous-set visibility
- visual restraint

Do not copy:

- Hevy branding
- Hevy colors
- Hevy social features
- Hevy navigation labels

## Boostcamp References

Use Boostcamp references for:

- program browsing
- program information architecture
- presenting structured training plans

Do not copy Boostcamp's visual identity.

---

# Technology

REIGN is a web app, added to the iPhone home screen. It is not a React Native
or Expo app and is not distributed through the App Store.

- Next.js, App Router
- TypeScript
- Tailwind CSS
- Supabase
- Vercel

Typography uses the system font stack, which resolves to the native system face
on each platform. No custom font is loaded.

# Milestones

`CLAUDE.md` holds the current milestone list and states which one is active.
It takes precedence over this document on scope and sequencing.

This specification describes the intended design across all of them. Do not
build ahead of the active milestone just because the design for a later one is
described here.

The visual result should be reviewed before building the workout logging system.
