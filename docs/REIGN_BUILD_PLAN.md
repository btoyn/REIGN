# REIGN — Revised Build Plan

Version 2. Supersedes the Milestone 1 plan.
Written after research into unmet needs in workout apps, plus a full interview about how Brandon actually trains.

> **Note, added when this plan was saved into the repository.** The `Revised CLAUDE.md`
> block below is superseded by the `CLAUDE.md` at the root of this repository, which was
> written later and carries more: how the owner actually trains, the brand asset
> constraints, the terminology rules, the full M0 to M7 list, and the progression rule.
> Do not replace the repository's `CLAUDE.md` with the block below. The rest of this
> plan stands as written.

---

## What changed and why

The original plan was built on assumptions that turned out not to match how you train or what you can operate. The interview surfaced four corrections.

| Original assumption | What is actually true |
|---|---|
| React Native, iPhone native app | You want it in the cloud, you will not pay $99/yr, and Apple Health is only a nice to have. Native cannot deliver its one advantage under those constraints. |
| You follow a periodized program (Week 6, Day 4) | You run a weekday split. Monday is back. There is no week counter. |
| The problem is choosing a program | The problem is that you record nothing and you do the same exercises every time |
| Static Today screen first, logging system later | Logging is the product. Everything else depends on having data. |

Two things from the original work were right and are kept unchanged: the visual design system, and the discipline of writing down why decisions were made.

---

## What REIGN is, restated

A personal training log for one person who currently keeps everything in his head.

It does three things:

1. **Remembers.** What you lifted, when, for how many reps. This is the entire foundation.
2. **Suggests.** Once it has history, it proposes today's weight and reps. You can always override.
3. **Varies.** When you want a different lat exercise, it shows you every lat exercise and how long since you did each one.

It is dark, restrained, gold-accented, and fast enough to use between sets.

---

## Stack decision

**Next.js progressive web app, hosted on Vercel, data in Supabase.**

You add it to your iPhone home screen. It opens full screen with no browser chrome and behaves like an app.

### Why this and not React Native

Native's only real advantage was automatic Apple Health import. Under your constraints that advantage does not exist:

- Apple Health requires a custom development build
- A custom development build requires the paid Apple Developer Program
- You will not pay for that
- Expo Go, the free path, cannot run Apple Health

So native costs you a fragile cloud build loop, an SDK version pin that will eventually break, and a dependency on a dev server just to open your own app, and it delivers nothing in return.

### What this costs you, honestly

- **Haptics.** iOS Safari does not support them. No buzz when you complete a set. There is no workaround. This is a genuine loss to the feel of the app.
- **Automatic cardio import.** You get a manual entry form instead, which you said you are fine with.
- **Background rest timer notifications** are unreliable. An on-screen timer while you are in the app works fine, and the screen can be kept awake.

### What it costs in money

Nothing. Supabase free tier, Vercel free tier, GitHub free. No annual fee, no app review, no expiring builds.

---

## What to keep from the existing work

Port these directly. They are specification, not code, and they survive the stack change intact.

**Keep in full:**
- All eight color tokens
- The 4-point spacing scale and the 20 to 24 point screen gutter
- Corner radii of 8, 12, 16
- Typography hierarchy: display, screen title, primary, primary small, secondary
- The rule that gold is an accent only, reserved for the primary CTA, active tab, completed sets, and PRs
- Flat surfaces, hairline dividers, one hero card, no shadows, no gradients
- Dark only
- Terminology: Workout, START WORKOUT, Last Workout, Program, Progress
- The four tabs: Today, Program, Progress, You
- Everything on the Today Screen Rules do-not-add list
- The habit of writing a rationale document

**Keep with one edit:**
- The Today screen hierarchy. Replace `Week 6 · Day 4` with the weekday split name, since you do not run a periodized program.

**Throw away:**
- All React Native code, roughly 350 lines. It does not port and it is the cheapest thing you made.
- The `CLAUDE.md` ban on persistence. That ban is what produced types that model rendered strings instead of real data.
- The gate that says review the visuals before building the logging system. That ordering is backwards for a solo builder.
- The `CARDIO / Apple Health` row showing a data source that does not exist. Replace with real manual entry.

**Note on the system font:** your spec calls for the native iOS system font. On the web this is free. A system font stack resolves to SF Pro on iPhone automatically. No custom font, spec honored.

---

## The progression rule

You asked for suggest, let me override. Here is the concrete rule. It is called double progression and it is simple enough to explain in a sentence, which is why it is the right choice.

Each exercise has a target rep range, for example 8 to 12.

- If you hit the **top** of the range on all working sets, REIGN suggests more weight next time and resets you to the bottom of the range.
- If you land **inside** the range, REIGN suggests the same weight and asks for one more rep.
- If you fall **below** the range twice in a row, REIGN suggests dropping about 10 percent.

Every suggestion is pre-filled and editable. Tap the number, change it, move on.

**Expectation to set now:** REIGN cannot suggest anything until it has watched you. Your first two or three weeks are you feeding it. Any app that claims otherwise is guessing.

Rather than a seeding wizard, the first time you log any exercise REIGN asks inline: what do you usually do here? That costs you five seconds per exercise instead of a five minute setup form, and it only asks about lifts you actually perform.

---

## The variety feature

You said you want groups like "traps do these, lats do these." The exercise database already supports this exactly.

The Free Exercise DB is public domain under the Unlicense, contains over 800 exercises, and tags each one by primary muscle using values including **lats, traps, middle back, lower back**, chest, shoulders, biceps, triceps, quadriceps, hamstrings, glutes, calves, forearms, abdominals. It also tags equipment.

So "show me lat exercises" and "show me trap exercises" are separate, correct queries on day one. No manual tagging required.

The variety screen shows every exercise for a muscle, sorted by how long since you last did it, so the ones you have been neglecting rise to the top.

---

## Data model

Seven tables. Lock this before writing screens.

**exercises** — loaded once from Free Exercise DB
`id, name, primary_muscle, secondary_muscles, equipment, category, instructions`

**splits** — your weekday plan
`id, day_of_week, name, target_muscles`

**workouts**
`id, date, split_name, started_at, finished_at, notes`

**workout_exercises**
`id, workout_id, exercise_id, position`

**sets**
`id, workout_exercise_id, set_number, weight, reps, is_warmup, completed_at`

**exercise_targets** — your rep range and current working weight per exercise
`id, exercise_id, target_rep_min, target_rep_max, current_weight`

**cardio_sessions**
`id, date, type, duration_min, avg_hr, max_hr, calories, distance`

Personal records are calculated from `sets`, not stored. Storing them creates two sources of truth.

**Critical:** store numbers as numbers. `5 exercises · ~52 min` is a display string assembled at render time, never a database column. The original `TodayWorkout` type stored formatted strings, which is why swapping in real data would have required rewriting the screen rather than the data file.

Because your gym has signal, there is no offline sync layer, no conflict resolution, no local database. Direct Supabase reads and writes. This removes the single hardest problem on the original build path.

---

## Build sequence

Each milestone ends with something you can open on your phone. Do not start the next one until the current one works.

### M0 — Prove the pipeline
Empty Next.js app, deployed to Vercel, connected to Supabase, opened on your iPhone home screen.
No features. The point is proving deploy works before there is anything to lose.

### M1 — Shell and theme
Four tabs, all eight color tokens, typography, spacing, dark enforced. Today screen with an honest empty state, because you have no data yet.
Program, Progress, You are placeholders.

### M2 — The logging engine ← the one that matters
Start a workout. Pick a muscle. Pick an exercise. Log weight and reps. Finish.
Set logging in two to three taps. Custom number pad, not the iOS keyboard. Big targets, usable one handed.
**When this ships, REIGN is real. Everything before it is scaffolding.**

### M3 — Memory and suggestion
Last performance shown the moment you open an exercise. Double progression pre-fills today's numbers. PR detection in gold.
This is where REIGN starts being better than a notes app.

### M4 — Rest timer and cardio
Auto-starting rest timer, screen stays awake. Manual cardio entry form.
Both small, both self-contained.

### M5 — Variety
Browse by sub-muscle. Sorted by time since last performed.

### M6 — Splits, then programs
Define Monday is back. Then optionally import a real program like Bigger Leaner Stronger.

### M7 — Progress
History, PRs, strength trend. Large numbers, restrained labels, no dashboard grids.

---

## Slices inside the build, and what is queued behind them

**Added later, during M2.** The milestones above are the shape of the build. The
slices below are how M2 to M4 are actually being cut, agreed in conversation and
written down here so "after slice E" means something.

| Slice | What it is | State |
|---|---|---|
| A | Today's state machine: the split learns itself, and the Ready state | Built |
| — | Program's weekday schedule, so a split can be corrected without touching the database | Built |
| B | Real workouts: start, in progress, resume, finish. `Discard workout` behind a confirmation step. `Change today` | Built |
| B2 | Set logging: weight and reps, with the custom number pad rather than the iOS keyboard | Built |
| A2 | Back to Today for `Resume` and `Done today`, which need a workout to exist before they can be built | Built, with B |
| C | The exercise picker rebuilt search-first, with Recent, Frequent and the six regions | Built |
| C2 | The movement loop on the photographs, and hiding an exercise | Built |
| D | Double progression suggestions | Next |
| E | Rest timer with screen wake lock | |
| F | PR detection and the last-time line | |

Two additions, decided while building M2:

- **Multi-muscle splits, after B.** `Push` is chest, shoulders and triceps. The
  data model already allows it; the control does not. Small, and it removes the
  limitation immediately.
- **Programs, after D.** Entering one is miserable without the search-first
  picker, and prescribed rep ranges are decoration without double progression.
  This pulls the program half of M6 ahead of M5 variety, deliberately: variety
  exists for improvised days, and following a program means fewer of them.

---

## Change today, and why it waits for slice B

Two different actions, separated in `docs/design/REIGN_UI_SPEC.md`:

- **`Change today`** — chest is right for Mondays, wrong for this Monday. Lives
  on Today. **Ships with slice B.**
- **Changing Mondays** — chest is no longer what Mondays are. Lives in Program.
  Built.

`Change today` waits for slice B because the override is not stored anywhere of
its own. `workouts.split_name` is a copy rather than a reference, so a workout
started after the override records `Back` while the split row still says
`Chest`. The deviation is recorded by the workout it produces. Until a workout
can be created there is nothing to record it on, and the control would change a
heading and forget.

### Read this before reporting it as a bug

**Once `Change today` ships: changing today does not survive a reload until you
start a workout.**

That is deliberate, not a lost write. Nothing has happened yet, so there is
nothing to remember, and tomorrow is a different day anyway. The moment a
workout exists, the change is permanent in that workout's own record.

If the change needs to survive a reload before any workout exists, that is a
different feature and needs somewhere to store a pending override. Say so and it
gets designed rather than bolted on.

---

## Queued after slice E

Two things deliberately deferred to this point. Neither is built. Do not start
either one early.

### Plate math

Deferred during M2. Revisit once the rest timer exists.

### Exercise alternatives

Given any exercise, suggest substitutes.

**How the ranking works.** Match on primary muscle and mechanic. Rank by
*different* equipment first, since the usual reason for wanting a substitute is
that the machine is taken. Secondary muscle overlap breaks ties.

**Two entry points, and they are not the same thing.**

- `Swap this exercise`, mid-workout, when a machine is taken. This is urgent and
  wants the closest match immediately.
- `Show me something different`, sorted by longest since last performed. This is
  the variety feature applied to one exercise rather than to a muscle.

**Pinned alternates.** The owner can pin his own alternates on any exercise. The
tags will not always match real judgment, and where they disagree the owner's
judgment wins. Pins rank above anything the matching produces.

**What this actually needs, checked rather than assumed.** The intent was that
this runs entirely off tags already in the exercises table with no schema change.
Two thirds of that holds. Primary muscle, secondary muscles and equipment are all
loaded and need nothing.

`mechanic` is not. The Free Exercise DB carries it — 491 compound, 298 isolation,
87 untagged out of 876 — but `supabase/seed/load_exercises.sql` selects only id,
name, primary muscle, secondary muscles, equipment, category and instructions, so
the column does not exist in the database. Adding it is one column and a re-run of
the loader, which is idempotent. `force` (push, pull, static) is unloaded for the
same reason and may be the better substitution signal; worth looking at when this
is built rather than deciding now.

Pinned alternates also need somewhere to live. No current table holds a pair of
exercises, and `exercise_targets` is one row per exercise, so it is the wrong
shape. That is a small new table, not a change to the seven.

So: no change to the locked seven tables, one added column on the reference data,
and one new table for the pins. Worth knowing before this is scheduled.

---

## Tooling

The original tooling list was written for a React Native build and no longer applies. This is the replacement.

**Use:**
- **Supabase MCP** — Claude reads your schema directly. Start in read-only.
- **Vercel MCP** — Claude reads its own failed build logs and fixes them.
- **GitHub MCP** — commit after every working feature. This is your only undo button and you cannot fix a broken project by hand.
- **Playwright MCP** — Claude opens your app in a real browser and checks its own work. This matters more for you than for a developer, because you cannot read the code to verify it. This was unavailable on the native path and is a real argument for web.
- **Context7 MCP** — keeps Claude writing current Next.js and Supabase code rather than outdated patterns.

**Skip:**
- shadcn MCP. Its default look fights your token system. Have Claude build the handful of components you need against your own tokens instead.
- Any fitness or health MCP server. They query data, they do not help you build.

Keep four to six servers active. Each one consumes context.

---

## Revised CLAUDE.md

Replace the existing file with this.

```
REIGN is a personal training log. Dark, restrained, fast enough to use between sets.

STACK
Next.js App Router, TypeScript, Tailwind, Supabase, Vercel. Progressive web app.
System font stack. No custom font.

DESIGN AUTHORITY
docs/design/REIGN_UI_SPEC.md is the visual source of truth.
Do not independently redesign REIGN.
Never recreate the lion in CSS, SVG, text, or generated graphics.
Gold is an accent, not a background.

DATA RULES
Store numbers as numbers. Never store a formatted display string in the database.
Personal records are calculated, never stored.
No offline sync layer. Direct Supabase reads and writes.

EVERY SCREEN MUST HANDLE
Loading. Empty. Error. Not just the happy path.
An unhandled empty state is a bug, not a later task.

SEQUENCE
Do not build ahead of the current milestone.
Do not add a feature that is not in the current milestone, even if it seems small.

OUT OF SCOPE UNLESS ASKED
Social feeds, followers, nutrition, macros, AI-generated workouts, challenges,
badges, streaks, quotes, recovery scores, readiness scores, trainer marketplace,
calorie rings, body diagrams, decorative charts.

WORKING RULES
Read docs/design/ before building a screen.
Use existing theme tokens. Do not invent colors.
Commit to GitHub after every working feature.
Verify UI changes in a real browser before calling them done.
Ask when a product decision is genuinely unspecified.
```

---

## Risks

**Scope creep.** The most likely way this dies. The out of scope list exists to be enforced, not admired.

**Building ahead of the milestone.** Claude will happily build M5 while you asked for M2. Say no.

**Losing work.** Commit constantly. You cannot repair a broken project by hand.

**Schema churn.** Lock the seven tables before M2. Changing them later breaks every screen built against them.

**Perfectionism on M1.** The theme and shell are satisfying to polish and produce nothing usable. Get to M2.

**Never opening it on your phone.** The original project was never once seen rendered. Open every milestone on the actual device.

---

## Open questions

- Which reputable programs matter beyond Bigger Leaner Stronger. Defer until M6.
- The brand assets are still unusable. The wordmark PNGs are opaque with a baked-in near-black background, and the icon is 255x230 where a proper icon is square and 1024x1024. A text wordmark stands in until you get clean exports. This should not block anything.
- Whether Apple Health is worth revisiting later. It would mean a native rebuild and the annual fee. Not now.
