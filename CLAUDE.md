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
Archivo, loaded by next/font. Condensed width for headings and large numbers,
regular width for body. Tabular figures on everywhere.

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

THE STRIP TEST
Remove all borders, shadows and corner radii. Does the layout still
communicate what matters? If yes, hierarchy comes from structure and
typography, which is correct. If no, it is leaning on cosmetic noise.
Apply this to every screen before calling it done.

ONE DOMINANT ACTION
Every screen has exactly one primary action. If two elements compete to be the
main call to action, the screen is not finished.

NEVER COLOUR ALONE
No state is signalled by hue only. Weight, size or a marker carries it too.

BRAND ASSETS
The wordmark is in use. assets/brand/reign-wordmark-transparent.png is derived
from the supplied PNG by removing its flat near-black background and its empty
margin. No ink was changed. The supplied file is untouched beside it.
The lion is the app icon, derived from assets/brand/reign-lion-approved.png by
cropping to its own edges and centring it on a square. Nothing was upscaled: the
master is 288 square and every icon is a reduction of it. The supplied files are
untouched.
The earlier rule here called for a placeholder because a real icon is 1024x1024.
That was App Store thinking. REIGN is a web app on a home screen, where iOS asks
for 180. There is no 512 icon, because that would mean upscaling.
Never recreate the lion in CSS, SVG, text, or generated graphics.

TERMINOLOGY
Workout, START WORKOUT, Last Workout, Program, Progress.
Never Session.

COPY
Functional, short, consistent. Never motivational.
Banned: "let's get after it", "ready to dominate", "you've got this",
"unlock your potential", "your fitness journey", "today's mission",
"crush", "legendary". Any second-person hype register.
Use the same word for the same thing every time. Never rotate between
Log, Train, Lift, Begin, Start.

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

FEATURE ADMISSION TEST
Before anything ships, it must answer all four:
1. What decision or action does it help with during a workout?
2. Which current milestone requires it?
3. What data makes it truthful?
4. Does REIGN_UI_SPEC.md support it?
If it cannot answer all four, it does not ship.

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
Never ship code you have not actually run. If this environment blocks testing,
build a local equivalent and test there. A check that cannot fail is worse than
no check.
Do not build ahead of the current milestone, even if it seems small.
Read docs/design/ before building a screen.
Use existing theme tokens. Do not invent colors.
Commit after every working feature.
Verify UI changes in a real browser with Playwright before calling them done.
Ask when a product decision is genuinely unspecified.

Open the pull request yourself at the end of every slice and put the link in the
message. Pushing a branch and leaving the pull request to be found is not
finishing. If one is already open for the branch, keep its title and description
current and give the link again anyway.

Say plainly how to see the change. Every slice ends with three facts: whether it
is merged, whether production is behind the branch, and which link to open. The
owner assumed a caching problem once when the merge simply had not happened, and
that was avoidable.

CURRENT MILESTONE
M2.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
