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

## Where the lockup actually appears

Two places, and the reasoning is worth keeping because "high-impact brand
moments" is a phrase that will otherwise justify putting the lion anywhere.

**The launch screen.** The second between tapping the home screen icon and the
app being ready to draw. Until now iOS filled it with the manifest's background
colour and nothing else. This is the one place in an app where a full logo
unambiguously belongs, because it is gone before it can be in the way. It costs
no screen space, competes with no action, and is the only moment where the app
has nothing else to say.

iOS matches launch images on exact pixel dimensions and will not scale one to
fit, so there is one file per device size. Ten are supplied, covering the
iPhone SE 2/3 through the 17 Pro Max. A device matching none of them gets the
blank background it got before, so an unlisted size is never worse than having
no launch image at all.

Next has no metadata field for these. They are plain `apple-touch-startup-image`
link elements in the document head.

**The foot of the You tab.** The only screen in the app that is not answering a
question during a workout. Today, Program and Progress all exist to tell the
owner something between sets, and a logo on any of them is a logo standing
between them and the answer. You asks nothing of anyone, so the space below its
last control is genuinely spare.

Rules it follows there:

- **160px wide**, from 536px of artwork, so a 3x screen never upscales it. The
  lockup carries fine facet work in the mane and a line of small type beneath,
  and both go to mush when the source is close to the display size.
- **Left aligned**, to the same edge as every other element in REIGN. Centring
  it would make the mark the one thing on the screen arranged to a different
  rule.
- **On the app's own background.** No card, no border, no panel, no plate. The
  artwork is transparent and the surface behind it is `bg`.
- **Set against the bottom**, not trailing the last control. There is almost
  nothing on this screen yet, so a mark that follows the copy lands a third of
  the way down with a field of black beneath it, which reads as a page that was
  cut off. At the bottom it reads as a signature. When settings arrive and the
  content grows past the screen, it simply follows them.
- **Never the screen's action.** Sign out is. The lockup is below it and quiet.

It is served unoptimised, for the same reason the wordmark is: Next's image
optimiser offers at most twice the display width, which would hand a phone
320px of a mark that has 536px available and soften it for no saving worth
having.

### Nowhere else

Today keeps the wordmark and only the wordmark. Program, Progress, Cardio and
every screen inside a workout carry no mark at all. This is checked rather than
intended: the walk asserts the lockup appears exactly once in the whole app.

### The transparent file

`assets/brand/reign-logo-transparent.png` is derived from the supplied
`reign-logo-approved.png`, which is opaque and would otherwise show its own
near-black rectangle against the app background. The supplied file is untouched
beside it.

The transparency was cut by flooding in from the edges rather than by keying out
the background colour, and the difference matters here in a way it did not for
the wordmark. The lion's own facets reach pure black — darker than the
near-black behind it — and 4,283 pixels inside the mark match the background
exactly. Keying on colour would have punched holes through the mane. The result
was checked afterwards: no colour altered, no holes, ink coverage identical to
the pixel.

Nothing was upscaled anywhere. Every splash image places the lockup at
`min(536, 46% of the device width)`, so the mark is only ever reduced.

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

Today reads the active program first, and falls back to the weekday split.

A program day assigned to this weekday wins. If there is none, the weekday split
answers. The six regions stay exactly as they are for days that are improvised,
which is most of them when no program is active.

Until programs are built, only the split answers, and that is the whole rule.

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

# Program — following a real program

A later milestone than the weekday schedule above, specified here because it
shapes decisions being made now.

## A split day is not always one region

`Push` is chest, shoulders and triceps. `Pull` is back and biceps. The six
regions describe what to train on an improvised day; they do not describe a
program's days, and forcing them to would misdescribe the training.

`splits.target_muscles` is already a list, so this needs no change to the data
model. What needs changing is the control: choosing regions becomes multi-select
with a name, so `chest + shoulders + triceps` can be called `Push`. Today then
says `PUSH`, and improvising within it opens the picker filtered to all three.

### One region stays one tap

The owner trains a weekday split — Monday is back — so the common answer must
not get slower in order to serve the uncommon one. The six regions still save on
a single tap with no confirm step.

Combining is a second path behind one quiet line, `Combine regions into one
day`, which is the shape the picker already uses for hiding an exercise. It is
not a control repeated on every region.

**Inside it, selecting is a toggle and nothing is written until Save.** That is
a sentence being composed rather than a single answer being given, which is why
it has a primary action and the six-region list does not. A chosen region is
marked by weight and by a check, never by the gold alone.

**The name field is prefilled with the regions joined** — `Chest, Shoulders &
Arms` — and typing replaces it. Prefilling is a description rather than an
invention: calling those three `Push` is the owner's word for it, and guessing
it would be REIGN deciding what programme they follow. Once they have typed,
changing a region no longer overwrites what they wrote.

This is the second text field in REIGN, and it is there for the same reason as
the first: naming a day means typing letters, which is what a keyboard is for.
The number pad exists because numbers between sets need speed.

A day with no regions cannot be saved, because that is a rest day and rest day
is its own answer. A day with a blank name cannot be saved, because Today could
not show it.

## Programs are the owner's data, never shipped

The repository ships the structure. The owner's database holds their copy of
what they follow.

No program is built in. There is no seed file, no bundled program data, and no
`built-in programs` concept. A program is entered through the exercise picker
like anything else, which also means the stored reference is REIGN's own
exercise, so there is no name-mapping table to build or maintain.

This is a design constraint, not a preference. Shipping a published program's
contents as application data would be someone else's material redistributed.

## Shape

Three tables, added beside the seven rather than altering any of them:

- a program: a name, and whether it is active
- a program day: its name, its muscles, and the weekday it is assigned to, which
  may be empty
- a program day's exercises: which, in what order, with sets and a rep range

The assignment lives on the program day. `splits` stays exactly what it is: what
is trained on a weekday when no program is driving.

`workouts.split_name` still copies the day's name onto the workout, so history
survives a program being changed or deleted.

## What Today says

`PUSH`, then `Bigger Leaner Stronger · Monday`.

**Not a day number.** `Day 1` reintroduces the program day counter that
`CLAUDE.md` forbids and that this specification's `Week 6 - Day 4` was corrected
for. The weekday already separates Monday's `Push` from Thursday's `Push`, so
the number carries nothing but the feeling of being on a schedule.

## Where programs live on screen

**Beneath the weekday split on the Program tab.** The split is what Today reads
unless a program says otherwise, and following one is optional, so it is the
second thing on that screen rather than the first. The section is a list plus
one quiet line to make a new one, and it says what a program is when there are
none rather than only that there are none.

**A program is one screen**: whether it is being followed, its days, and the way
to add one or delete the lot. Following is a real button rather than a switch
marked by colour, because it decides what Today reads.

**A day is one screen**: what it prescribes, and which weekday it falls on. A
day is added with the same control the weekday split uses, because it is the
same question — what does this day train — and a program's day is exactly the
multi-region day that control makes.

**A prescription is a number of sets and a rep range**, both chosen from
presets. The rep presets are the same four the exercise screen offers when a
lift is logged for the first time: one list in the app rather than two that
could drift, which is right because a program's range and a lift's range are the
same kind of thing.

**Deleting is behind a confirmation that names what is lost** and says workouts
already done are not touched, which is true — history copies the day's name onto
the workout.

## Starting a workout from a program day

The day's exercises are already in the workout when it opens, in the order the
program lists them.

This is what following a program actually buys. Without it, following changes a
label on Today and the owner still adds five exercises by hand every session.

It does not happen when the day has been overridden. `Change today` means
training something else, and pre-loading the program's push day into an arms
workout would be the opposite of what was asked.

## Rep ranges seed, they do not override

`exercise_targets` holds one rep range per exercise for the whole app, which is
the statement that a lift has a rep range. A program day prescribing its own
ranges is a different statement, and having both would leave double progression
reading a row that changes meaning depending on which day it was written from.

A program day's ranges **seed** `exercise_targets` the first time that exercise
is used, and after that the per-exercise row is the truth. That keeps the
progression rule reading one place, and matches how the owner actually
progresses: per lift, not per day.

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

## What appears in browse

The library is 876 exercises, most of which the owner will never do. Browse is
trimmed to what a commercial gym holds:

- category `strength` or `powerlifting`
- equipment is not `kettlebells`, `bands`, `medicine ball`, `exercise ball`,
  `foam roll`, `other`, or empty
- the name does not contain `chain` or `band`, which removes the seventeen
  bar-and-chain variations that need equipment a commercial gym does not have

That leaves **462**. Chest goes from 84 to 55, Legs from 298 to 93.

Nothing is deleted from the database and nothing becomes unreachable. The trim
applies to **browse only**. Search reaches the whole library, so a stretch or a
strongman lift is still one query away.

## Recent and Frequent

These carry most of the traffic once there is any history, and they matter more
than the hierarchy below them. Both sit above browse and above the fold.

**Recent** — the last ten distinct exercises, most recently used first.
**Frequent** — the most logged, by how many workouts contain them.

Both are read from the owner's own workouts, not from the library, so neither is
filtered by the trim: an exercise that has been done belongs in these lists
whatever its category.

Both are absent until there is history. An empty list is worse than no list.

## Search

Search reaches everything and is the primary entry point, because most of the
time the owner knows the name.

**It has to work on the names the owner uses, not the library's.** Three rules,
in this order:

1. **Normalise both sides** — fold case, strip punctuation and hyphens, collapse
   whitespace. This alone makes `skullcrusher` find `Skull Crusher` and
   `bench press` find `Bench Press - Powerlifting`.
2. **Aliases**, hand written and editable, for the terms the library simply does
   not use. `overhead press` and `RDL` both return nothing without them.
3. **Ranking, kept simple** — exact name, then name begins with the query, then
   shortest name. Deliberately not clever: a query like `curl` matches 66
   exercises and no ranking makes 66 into an answer. Recent solves that once
   three curl variations have been logged.

## The second level, per region

It differs by region, because the regions differ. Each is chosen from what makes
that region scannable, not from one rule applied six times.

| Region | Count | Second level | Why |
|---|---|---|---|
| Chest | 55 | Equipment | One muscle, so sub-muscle does not exist. Five even buckets. |
| Back | 55 | Sub-muscle | lats 20, middle back 19, traps 10, lower back 6. This is the variety the owner asked for, and it separates a lat day from a trap day. |
| Shoulders | 74 | Equipment | Sub-muscle is useless here: shoulders 72, neck 2. |
| Arms | 122 | Sub-muscle | triceps 57, biceps 48, forearms 17. By equipment the largest bucket would be 49 and mixed. |
| Legs | 93 | Sub-muscle | quadriceps 50, hamstrings 18, calves 12, glutes 11. By equipment, barbell alone is 39. |
| Core | 63 | None | By equipment it is body only 38 and four scraps; by muscle it is one bucket of 63. A second level would be a pile and some crumbs, so the list is flat. |

**Long buckets carry equipment headings inside them.** Quadriceps at 50 and
triceps at 57 are still long after the split. They are grouped under `Barbell`,
`Dumbbell`, `Cable`, `Machine`, `Bodyweight` headings within the one list, so the
owner can jump to the section rather than read every row. This is structure in
the list, not another tap.

## Variety

The third thing REIGN does. Browse exists so a part that has been left alone
becomes visible without having to remember, so both browse levels are ordered
and labelled by how long it has been.

**The exercise list is sorted by how long since each was last performed**, the
longest ago at the top. Exercises that have never been done follow, in
alphabetical order. That order is the whole decision: the other way round would
bury three movements the owner actually rotates under four hundred that have
never been touched, which is a catalogue rather than a suggestion.

**Every row says how long ago as well as what it is** — `cable · 4 weeks ago`. A
row for an exercise never done says only the equipment, because `Not done` on
four hundred rows is noise. Recent and Frequent carry the same line, so the
sentence under a name means the same thing everywhere in the picker.

**How long ago is written in words, never as a date.** Days up to a fortnight,
then weeks, then months. `63 days ago` is a number to decode; `2 months ago` is
a fact. The question is how long it has been, not when it was.

**The sub-muscle row reports age, not size.** `Lats · Yesterday`, not `Lats ·
20`. The region row above it already gave the size of what was being entered;
having chosen the region, the remaining question is which part has been left
alone. A part never trained reads `Not done`.

The sub-muscle rows themselves stay in a fixed order rather than re-sorting by
age. There are at most four of them, all visible at once, so sorting buys
nothing and costs a list that moves under the thumb between visits.

### What counts as having been performed

A workout counts once it is **finished**, and **today's counts while it is still
being done**.

Both halves matter. Without the first, a workout walked out of half way through
would make an exercise look performed when it may never have been, which is
exactly the lie this feature must not tell. Without the second, an exercise
added ten minutes ago would be missing from Recent, and Recent is what gets
reached for while standing in the gym.

An abandoned workout and one in progress are indistinguishable until the day is
over, so the date is what separates them.

## Deleting a workout

Any stored workout can be deleted from its own screen, which is reached from
Progress.

This was missing entirely. Today can discard the session you are in the middle
of, but only that one: it looks at today and nothing else. A workout you
finished, or one you walked out of on a Tuesday three weeks ago, could be read
from Progress and never removed.

**Delete rather than discard.** Discarding abandons something you are in the
middle of; this removes a record that has been kept. Different actions, so
different words — which is the terminology rule, not an exception to it.

**Behind a confirmation that names what is lost**: `1 exercise, 3 sets will be
deleted. This cannot be undone.` A workout holding nothing says `Nothing in it`,
because warning about nought exercises and nought sets reads as a bug rather
than a warning.

It lands back on Progress afterwards. Today only ever shows today, so it is the
wrong place to arrive after deleting something from three weeks ago.

## Substitutes

The machine is taken. What else trains the same thing?

Reached from the exercise screen mid-workout, as `Swap this exercise`. Picking
one replaces the exercise in place, keeping its position in the workout.

**Only while nothing has been logged against it.** Once a set exists that
exercise was performed, and changing the name over it would rewrite what
happened rather than change what is about to. The link simply goes, which reads
as "too late for that" without a sentence explaining a control that no longer
applies. The write refuses as well, so reaching the address directly cannot do
what the screen will not offer.

### The order, and why each step is where it is

1. **Different equipment first.** The reason for asking is almost always that
   the thing you wanted is occupied, so an answer needing the same machine is
   not an answer. Same-equipment substitutes still appear, below.
2. **Then the closest match**, by how many secondary muscles it shares.
3. **Then longest since last performed**, the variety rule browse already uses.
   Between two equally good substitutes, the neglected one is the better answer.
4. **Then the name**, so the order never depends on what the database returned.

Excluded: the exercise itself, anything already in this workout, anything
hidden, and anything outside the gym trim.

**Every row says why it is being offered** — `dumbbell · 2 shared muscles · not
done`. The order is a judgement, and a judgement that can be read is one that
can be overruled.

### Where the tags run out

This is worth recording plainly, because it is the argument for the next part
rather than a defect to hide.

Asked for a substitute for the barbell bench press, the tag ranking's first
answer is **Bent-Arm Dumbbell Pullover**. Same primary muscle, different
equipment, and it shares both secondary muscles, so by the tags it is a perfect
match. It is not a bench press.

No ranking fixes that, because the tags genuinely do not distinguish the two.
Two things narrow the gap:

- **Mechanic**, compound against isolation, which the owner asked for and which
  was never loaded into the table. Migration 0005 adds it and backfills 789 of
  the 876 from the same source the library came from.
- **The owner's own pins**, which is the real answer. They said it before any of
  this was built: the tags will not always match real judgement. So the
  judgement wins, and a pinned alternate is offered above anything the tags
  found.

A pin is read in both directions. Saying A can be swapped for B also answers
"what instead of B" — the two are interchangeable rather than one subordinate to
the other, and it means pinning a pair once rather than twice.

## Photographs

Every exercise has two: the start of the movement and the end. They alternate on
a slow loop, so what a movement actually is can be seen rather than read.

The paths are derived from the exercise id — `<id>/0.jpg` and `<id>/1.jpg` — so
this needs no column, no migration and no stored data. All 462 in the trimmed
set have both. The three in the whole library without them are kettlebell
movements the trim already removes.

No muscle diagrams. The muscle is already written down; what text cannot show is
the movement.

They are shown in monochrome. The source photographs are shot in a red-walled
gym and the colour fights everything else in REIGN, which is the one place the
interface would otherwise carry a hue nobody chose. Removing it also makes the
loop easier to read, because the only thing changing between the two frames
becomes the body rather than the body and a wall.

Drawn illustrations were considered and rejected on supply rather than taste.
The leading open set, Everkinetic, is 293 exercises against this library's 462,
is CC BY-SA, and its artwork is gone: both of its image hosts no longer resolve.
Half the library drawn and half photographed would look worse than either done
consistently, and a photograph of the real setup answers questions a line
drawing cannot, such as where the feet go.

### They are served through our own origin, not linked from GitHub

`next/image` fetches them server side and serves them from REIGN's own origin.
The phone talks to one host on gym wifi rather than two, the images arrive sized
for the screen instead of at 850 pixels wide, and Vercel caches them at the edge
after the first request.

Measured on a three-times density phone, which is what the owner has: the pair
of photographs costs 80,434 bytes through our origin against 145,018 linked
directly. About 45 percent less.

An earlier note here claimed eight and a half times smaller. That was the 256
pixel width, which a three-times screen never picks; it chooses 1200 for
sharpness. The saving is real but smaller than first written.

This was found by accident and is worth recording. A page linking the images
directly failed on all twelve and took 29 seconds to do it. The cause was the
build sandbox's own proxy rather than GitHub, which serves them in 133ms, but
the shape of that failure is exactly what a weak connection produces: not a
clean error, a long hang and then nothing. The same page through `next/image`
loaded all twelve and settled in 3.8 seconds.

### When an image does not load

It will, on gym wifi. Four rules:

1. **The frame reserves its aspect ratio from the first paint.** Nothing moves
   when the photographs arrive, and nothing moves when they fail.
2. **A failure is a sentence, never a broken image icon.** The reserved frame
   holds a quiet line saying the photographs could not be loaded.
3. **The frame is tappable to try again.** No new control: the box is already
   there, and a second attempt is what anyone would want.
4. **There is a deadline.** An `img` element has no timeout and will hang for as
   long as the network lets it, which was measured at 29 seconds. If the
   photographs have not arrived within a few seconds, the frame shows the
   failure rather than continuing to wait. A picture that arrives after the set
   is finished is worth nothing.

## Hidden exercises

The owner can hide an exercise they will never do. Personal curation beats any
filter guessed in advance, and it means the trim above does not have to be
perfect.

A hidden exercise disappears from browse and from search.

Hiding is a **mode**, not a control on every row. There are 462 rows and hiding
is rare, so a control on each of them would be furniture on all to serve one.
One line at the foot of the picker, `Hide exercises I never do`, turns the list
from adding to hiding; `Done` turns it back. While the mode is on, the screen
says so plainly, because a list where tapping removes rather than adds must
never be mistaken for the ordinary one.

**The mode is also the escape.** Hidden exercises reappear while it is on, so
they can be brought back. That replaces the separate `Show hidden` control this
section used to call for: one mechanism instead of two, and nothing is ever
permanently unreachable.

The switch sits at the foot of the picker rather than inside browse, so it is
reachable while searching. An exercise that was hidden is most likely to be
looked for by name, and it would otherwise have no way back.

A hidden row is struck through **and** says `Hidden`. Neither depends on the
other and neither is a colour.

Nothing is deleted, ever.

This is the one part of the picker that needs storage: one small table, added
beside the seven rather than altering any of them.

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

# Progress

Progress should emphasize:

- workout calendar
- consistency
- PRs
- exercise history
- strength trend
- cardio history

Metrics should be presented simply.

Avoid analytics overload.

Large numbers with restrained supporting labels are preferred over dense dashboards.

## It is built in three parts

The six lines above are a direction rather than a screen, and doing all of them
at once is how a training log turns into a dashboard. They are built in the
order they are worth having:

1. **History** — every finished workout. This is the foundation, and it is the
   first thing CLAUDE.md says REIGN does. Until it existed, a workout left the
   screen when it was finished and could not be reached again.
2. **Records** — the heaviest set of each exercise, and when it happened.
   Calculated, never stored.
3. **Trend and consistency** — one exercise's weight over time, and how often
   training actually happens.

Each reads the same rows. None of them needs a column added.

## Consistency

How much training there has actually been: a count of finished workouts in the
last four weeks, with the four weeks before it beside it. The count is the large
number the specification asks for; the label under it is the restrained part.

**A count over a window, never a streak.** CLAUDE.md puts streaks out of scope
and it is right to: a streak turns one missed Tuesday into a punishment, and
this has to survive a week off with a cold. A missed month reads as a nought,
not as something broken.

**The window before it is shown alongside**, because a number on its own says
nothing — fourteen is good or bad depending on what the month before held. It is
absent on day one rather than reading `0 in the 4 weeks before that`, which
would be a nought about a period the owner had not started training in.

## Strength trend

One lift over time, reached by tapping its record.

**There is no chart.** CLAUDE.md bans decorative charts and this specification
prefers large numbers with restrained labels. Apply the strip test to a line
graph here and it fails: a column of working weights in tabular figures already
reads as a trend, and taking the graph away loses nothing, which means the graph
was never carrying anything.

What is there instead:

- **The weight being lifted now**, as the large number. Not the best from a year
  ago — that is what Records is for.
- **How it has moved**, in one sentence: `Up 40 lb since 17 June 2026`. Two
  points, and the wording says exactly that. Anything fitted would be arithmetic
  presented as insight.
- **Its best**, stated plainly beneath.
- **Every session**, newest first, each showing its working sets and its date,
  and each opening the workout it belonged to.

**A weight that has come down says so.** `Down 20 lb since 17 June 2026`, not
hidden, not coloured red. A deload is a decision, not a failure, and the number
is the number.

**Warm-ups are left out of the session line.** They belong on the workout
screen, where they are part of the day, but they break the column of working
weights that makes the trend readable.

## Records

The heaviest set on every lift, calculated from the sets each time the screen
opens. There is no records table and no column holding a best, per CLAUDE.md.

**What counts as the record.** The heaviest working set. Ties on weight go to
the most reps, which is the harder of the two. Warm-ups are never records, the
same rule progression follows, and a set with no numbers on it is not an attempt
at anything.

No estimated one-rep max. That would mean picking a formula nobody chose and
presenting arithmetic as an achievement. What was actually lifted is the record.

**A record is dated the first time it was achieved.** Hitting 225 for 3 again in
September did not set anything; it repeated something set in June. Without this
the list would re-date old bests and every repeat would read as new.

**A lift logged at nought pounds reads as reps alone** — `14 reps`, not
`0 lb × 14`. A bodyweight movement is carrying the body, so the weight is not
the achievement and printing a nought says the opposite of what happened.

**The order is most recently set first.** What was just achieved rises, and a
best that has stood untouched for a year sinks. Two set on the same day go
heaviest first. That is the same instinct behind variety: recency is information
in this app, so the list says something rather than being an index.

**A workout still in progress counts.** The record set twenty minutes ago is on
this list before the workout is closed, because the exercise screen has already
marked it `PR` and the two must not disagree for an hour. This is the same rule
variety uses, stated once in `workouts.ts`.

### Where they appear

The five most recently set sit at the top of Progress, above the history, with
the rest one tap away on their own screen. That is the shape the picker already
uses for Recent and Frequent: a handful of the most useful, and the full list
behind them. Opening on forty rows before the history is the analytics overload
this specification warns about.

The section is absent until there is a record, and the link to the full list is
absent until there are more than five.

**The rows do not link anywhere.** One exercise's history over time is the third
part of Progress; a row that looks tappable and is not would be worse than a row
that plainly is not.

### Two headings at one type size

Progress now holds two lists, `RECORDS` and `HISTORY`, and the history has month
headings inside it. There is one label size in the type scale and inventing a
second would be inventing a token, so the spacing carries the difference: a
label sits tight against the rows it names, and far from whatever came before
it. Nothing about it is a border, a box or a radius, so it survives the strip
test.

## History

Every finished workout, newest first. The one in progress is not here: it is on
Today, which is the screen for the day you are in. A workout walked out of and
never finished is not a record of anything, so it is not here either.

**Each row is the split name, a line about the workout, and the day.**
`Back` / `5 exercises · 52 min` / `Sunday 30`. The split name leads because that
is what the day was, and it is how the owner thinks about it. A workout started
outside the schedule has no split, so it reads `Workout` and the date carries
it.

**The line is assembled when rendering.** `5 exercises, 52 min` is the example
CLAUDE.md uses for something that must never be a database column, and it is
not one. A workout with no start time to measure from leaves the duration out
rather than showing a nought or a dash, the same rule cardio follows.

**Months are headings.** A year of training is a long list of dates, and a date
on its own does not say how long ago it was. The heading gives the list a spine
without adding a control or another tap.

**A row opens the workout itself**, not a second read-only view of the same
rows. The workout screen already shows a finished workout correctly: its
exercises, the sets under each, and none of the controls. It now also says when
it was and how long it took, because reached from here it needs to.

**There is no primary action**, the way Program has none. This is a screen for
reading. Starting a workout lives on Today, and repeating it here would put two
primary actions in the app for the same thing.

**Empty, it says what will fill it** rather than only that it is empty.

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

## How it is entered

By hand. There is no Apple Health on the web, so nothing arrives on its own,
and what is recorded is what the machine's display says at the end.

The type comes from presets rather than a text field, so the same machine is
never called two things and the entry needs no keyboard. Only the time is
required: a bike reports distance, a stair climber does not, and neither reports
heart rate without a strap. **What a machine never reported is left out of the
line entirely, never shown as a dash**, because a dash reads as a number that
failed rather than a measure that was never taken.

The same number pad as sets, for the same reason.

On Today it sits beneath everything, and `Add cardio` is a quiet link. Today's
one dominant action is starting or resuming a workout, and cardio must never
compete with it. The `CARDIO` heading appears only once there is something under
it.

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
