REIGN is a personal training log for one person.
Dark, restrained, fast enough to use between sets.

WHAT IT DOES
1. Remembers. What was lifted, when, for how many reps. This is the foundation.
2. Suggests. Once there is history, it proposes today's weight and reps. Always overridable.
3. Varies. Shows every exercise for a muscle, sorted by how long since it was last done.

OWNER
Not a developer. Explain in plain language. Do not assume developer knowledge.
On Windows, not a Mac.

HOW THE OWNER TRAINS
A weekday split. Monday is back, and so on. Not a periodized program.
There is no week counter and no program day number.
The UI spec shows "Week 6 - Day 4". That is wrong. Use the split name instead.
Real programs are browsable later, but following one is optional.

STACK
Next.js App Router, TypeScript, Tailwind, Supabase, Vercel.
A web app added to the iPhone home screen. Not React Native, not Expo, not App Store.
System font stack. No custom font.

DESIGN AUTHORITY
docs/design/REIGN_UI_SPEC.md is the visual source of truth.
Its technology sections are out of date. Its design direction is current.
Do not independently redesign REIGN.
The interface should feel premium, restrained, strong, calm, capable, and highly
legible during a workout.
Avoid neon colors, excessive cards, unnecessary icons, dashboard grids,
decorative charts, clutter, gradients, and invented features.
Gold is an accent, not a background. Use it for the primary button, the active
tab, completed sets, and PRs.

BRAND ASSETS
The supplied wordmark PNGs are opaque with a baked-in near-black background and
cannot sit on the app background. Use a text wordmark until clean exports arrive.
The supplied icon is 255x230. A real icon is square and 1024x1024. Use a
placeholder. Do not upscale or alter the supplied files.
Never recreate the lion in CSS, SVG, text, or generated graphics.

TERMINOLOGY
Workout, START WORKOUT, Last Workout, Program, Progress.
Never Session.

DATA RULES
Store numbers as numbers. Never store a formatted display string in the database.
"5 exercises, 52 min" is assembled when rendering, never a database column.
Personal records are calculated, never stored.
No offline sync layer. Direct Supabase reads and writes.
Exercise library comes from the Free Exercise DB, loaded into Supabase once.
It is public domain and already tagged by muscle including lats, traps,
middle back, and lower back, and by equipment.

PROGRESSION RULE
Double progression. Each exercise has a target rep range.
Hit the top of the range on all working sets, suggest more weight, reset to the
bottom of the range.
Land inside the range, suggest the same weight and one more rep.
Fall below the range twice in a row, suggest about 10 percent less.
Every suggestion is pre-filled and editable.
There is no history at first, so the first time an exercise is logged, ask inline
what the usual working weight is. Do not build a separate setup wizard.

EVERY SCREEN MUST HANDLE
Loading. Empty. Error. Not just the happy path.
An unhandled empty state is a bug, not a later task.

OUT OF SCOPE UNLESS ASKED
Social feeds, followers, nutrition, macros, AI-generated workouts, challenges,
badges, streaks, quotes, recovery scores, readiness scores, trainer marketplace,
calorie rings, body diagrams, decorative charts, Apple Health, offline sync.

MILESTONES
M0 Deploy to Vercel and get it on the iPhone home screen. No design, no features.
M1 Four tabs, theme tokens, Today screen with an honest empty state.
M2 The logging engine. Start a workout, pick a muscle, pick an exercise, log sets.
   Two to three taps per set. Custom number pad, not the iOS keyboard.
M3 Last performance shown on open. Double progression suggestions. PR detection.
M4 Rest timer with screen wake lock. Manual cardio entry.
M5 Variety. Browse by sub-muscle, sorted by time since last performed.
M6 Weekday splits, then optional programs.
M7 Progress. History, PRs, strength trend.

WORKING RULES
Do not build ahead of the current milestone, even if it seems small.
Read docs/design/ before building a screen.
Use existing theme tokens. Do not invent colors.
Commit after every working feature.
Verify UI changes in a real browser with Playwright before calling them done.
Ask when a product decision is genuinely unspecified.

CURRENT MILESTONE
M0.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
