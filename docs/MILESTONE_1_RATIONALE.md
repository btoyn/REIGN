# REIGN — Milestone 1 Rationale

Why the Milestone 1 code looks the way it does, traced to the direction it came from.

Companion to `docs/MILESTONE_1_CODE.md`, which contains the code itself.

---

## How this document is organized

Every non-obvious decision in the codebase falls into one of three buckets:

1. **Directed** — someone specified it. Traced to the instruction below.
2. **Derived** — forced by something discovered in the supplied files or the toolchain.
3. **Chosen** — the specification did not cover it, so a judgement call was made.

The third bucket is the one worth reviewing. It is collected in its own section at the end
rather than buried, because those are the places where the code could reasonably differ.

---

## The direction that shaped the code

The plan went through four rounds of correction before any code was written. Each round
removed something from the implementation.

| Round | Correction given | Effect on the code |
|---|---|---|
| 1 | Pin to Expo SDK 54; do not use the latest SDK | `package.json` pinned to SDK 54's dependency set |
| 1 | REIGN is dark-only; drop the light palette | No light tokens, no `useColorScheme`, dark enforced in four places |
| 1 | Do not design the Today screen; a spec is coming | Implementation waited; hierarchy came from the spec, not invention |
| 1 | Use "Workout", not "Session" | Terminology throughout types, files, and copy |
| 1 | Do not assume Today needs an exercise list | No exercise list exists in `TodayScreen.tsx` |
| 1 | Simplify structure; avoid feature folders | Flat `screens/components/theme/data` |
| 2 | Scaffold from the SDK 54 template directly, not latest-then-downgrade | `--template default@sdk-54` |
| 2 | Do not build the shell yet; everything lands together | Single commit, no partial delivery |
| 3 | (Files supplied: spec, references, brand assets) | Implementation plan written against them |
| 4 | Eight explicit decisions on the plan | Detailed below |

The consistent shape of this feedback was *narrowing*. The first proposal was larger than
what was wanted in every dimension — newer SDK, more folders, more screen content, more
invented design. Each round cut. The code reflects the end state of that cutting, which is
why it is 589 lines rather than several thousand.

---

## Directed decisions

### Expo SDK 54, pinned exactly

**Direction:** "Pin the project to Expo SDK 54 for now because the iPhone testing workflow
will use the current App Store version of Expo Go." Then: "create the project directly from
the SDK 54 template rather than creating the latest SDK and downgrading it."

**In the code:** every dependency in `package.json` carries an exact version with no `^` or
`~` range. A caret range is how a project silently drifts off a pinned SDK on someone else's
`npm install`, which would break the Expo Go workflow the pin exists to protect.

The second correction mattered more than it looked. `latest` was SDK 57 at scaffold time — a
three-version downgrade that would not have converged cleanly. Scaffolding from
`default@sdk-54` produced a coherent SDK 54 dependency set in one step.

### Dark-only, enforced in four places

**Direction:** "REIGN is dark-only in V1. Remove any assumption of a light palette."

**In the code:** one place is not enough, because a dark app can still flash white during
startup and navigation. So:

- `app.json` sets `userInterfaceStyle: "dark"` (not `automatic`), with `#0A0A0A` on both
  `backgroundColor` and `ios.backgroundColor`, and on the splash background
- `app/_layout.tsx` pins a REIGN-tinted `DarkTheme` into React Navigation's `ThemeProvider`.
  Without this, React Navigation applies its default light theme between routes and the
  transition flashes white
- the same file sets `<StatusBar style="light" />`
- `ScreenContainer` paints `colors.bg` explicitly rather than inheriting

`src/theme/colors.ts` has no light variant to switch to, and the template's
`useColorScheme` hooks were deleted, so there is no code path that could select one.

### Colors, spacing and radii taken verbatim

**Direction:** the spec's "Color System", "Spacing" and "Corner Radius" sections.

**In the code:** `src/theme/colors.ts` carries the eight specified hex values and nothing
else. `spacing.ts` is the specified 4-point scale. `radius.ts` is `8 / 12 / 16`. Each token
file names the spec section it came from in a comment, so a future change has an obvious
place to be checked against.

No color was added. Gold appears in exactly two places in the running app — the
`START WORKOUT` button and the active tab — which is what "gold is an accent, not the
dominant interface color" reduces to in practice.

### Terminology

**Direction:** "Use the term 'Workout,' not 'Session.' The primary CTA will be
'START WORKOUT.'"

**In the code:** the types are `TodayWorkout` and `LastWorkout`, the data exports are
`todayWorkout` and `lastWorkout`, the section label is `LAST WORKOUT`, and the button label
is the literal string `START WORKOUT`. The word "session" does not appear in the source.

### Today screen content and order

**Direction:** the spec's "Today Screen → Information Hierarchy", plus "Do not assume the
Today screen needs an exercise list."

**In the code:** `TodayScreen.tsx` renders the spec's blocks in the spec's order and stops.
Header and date, `TODAY`, the workout block, the CTA, `LAST WORKOUT`, `CARDIO`. Every string
is the spec's string. There is no exercise list, no streak, no chart, no ring, no score.

The spec's own framing — "answers one question immediately: what am I doing today?" and
"should not attempt to summarize the entire app" — is why the screen ends after three
sections instead of continuing.

### One hero card, flat sections below

**Direction:** "Today primary workout block: use one restrained `surface` hero card. Keep
LAST WORKOUT and CARDIO flat with subtle dividers."

**In the code:** the workout block is the only `View` with a `backgroundColor`, `borderRadius`
and border. `LAST WORKOUT` and `CARDIO` are plain stacked text separated by
`StyleSheet.hairlineWidth` dividers in `colors.border`.

This came out of the spec's warning against turning every section into a card, and the Hevy
reference's left screen, which organises a long form with thin rules rather than nested
boxes. The card earns its place by marking the one thing on the screen that matters.

### Tab icons

**Direction:** "use Ionicons `home-outline`, `barbell-outline`, `trending-up-outline`, and
`person-outline`, with appropriate filled variants where available for the active state."

**In the code:** `app/(tabs)/_layout.tsx` swaps each glyph on `focused`. `@expo/vector-icons`
already ships with the Expo template, so this added no dependency — the bundle confirms
`Ionicons.ttf` is included.

### Live date, static everything else

**Direction:** "use the live device date as a display-only value. All workout/program/cardio
data remains static mock data."

**In the code:** `BrandHeader.tsx` calls `new Date()` and formats it with
`toLocaleDateString`. Nothing reads that value; it is rendered and discarded. Every other
string on the screen comes from `src/data/today.ts`, which holds fixed literals.

The two are deliberately kept apart. The date lives in the component because it is a display
concern; the mock content lives in a data module because it is the thing that gets replaced
when a real source arrives.

---

## Derived decisions

These were not directed. They were forced by something found in the supplied files or the
toolchain, and each was raised before it was acted on.

### The brand wordmark is not on screen

**What was found:** all four PNGs under `assets/brand/` decode as opaque RGB with no alpha
channel, on a baked-in `#030303` background. The app background is `#0A0A0A`. Placing the
wordmark on the Today screen would have shown a faint darker rectangle around it, most
visible on an OLED iPhone in a dark room.

**What was decided:** "do not use the opaque wordmark on the Today screen yet... use a
restrained text-based 'REIGN' header using the existing typography/colors; do not attempt to
recreate the graphic wordmark."

**In the code:** `BrandHeader.tsx` renders the letters `REIGN` as text with wide tracking.
Its docstring states why, so the next person to open the file does not mistake it for a
design choice and does not have to rediscover the alpha problem.

This is the one place where `CLAUDE.md`'s rule — never recreate the lion in CSS, SVG, text or
generated graphics — sat closest to the work. A text stand-in for the wordmark is permitted;
anything resembling the lion is not, so nothing was drawn.

### App icon and splash keep template placeholders

**What was found:** `reign-app-icon-approved.png` is 255×230. An iOS icon must be square and
1024×1024. `reign-lion-approved.png` is 240×230, which limits a crisp splash to roughly 80pt
wide. `CLAUDE.md` forbids altering or upscaling the supplied assets, so there was no
compliant way to make them fit.

**What was decided:** "leave the SDK template placeholders for Milestone 1. Do not wire the
undersized brand images into app.json yet."

**In the code:** `app.json` points `icon` and the splash `image` at the template files under
`assets/images/`. This costs nothing in Milestone 1, since Expo Go renders its own icon
regardless. Only the splash *background* was changed to `#0A0A0A`, because leaving the
template's `#ffffff` would have produced exactly the white flash the dark-only requirement
exists to prevent.

### Template scaffolding was deleted, not adapted

**What was found:** the SDK 54 default template ships a light/dark demo app —
`ThemedText`/`ThemedView`, `useColorScheme` hooks, a `constants/theme.ts` with both palettes,
a parallax scroll demo, an `explore` tab and a `modal` route.

**Why it went:** all of it is built on the assumption that the app follows the device color
scheme. Keeping it would have left live code paths that select a light palette in an app
specified as dark-only. Adapting it would have meant maintaining someone else's abstraction
for a four-screen app. Deleting it was smaller than either.

### Verification had to route around the sandbox

**What was found:** `exp.host` and `reactnative.directory` both return HTTP 403 at this
environment's proxy. `expo-doctor`'s config-schema and package-metadata checks call them, and
plain `expo start` crashes on startup parsing the proxy's non-JSON error body.

**What was done:** `expo start --offline` for the boot check, and `expo config --type public`
to validate the config locally instead of against the remote schema. The result — 16 of 18
doctor checks passing, with the two failures identified as network rather than project
problems — was reported as exactly that rather than as a clean pass.

---

## Chosen decisions — the ones worth reviewing

The spec fixed the colors, the spacing scale, the radii, the copy and the section order. It
described typography as a hierarchy ("Display", "Screen Title", "Primary Content",
"Secondary Content") without giving numbers. The following values were chosen, informed by
the Hevy reference's density and by the spec's instruction that secondary text should
visually recede. They are all in one file and all easy to change.

| Value | Chosen | Reasoning |
|---|---|---|
| `primary` type | 28px / 700 | `PUSH A` must read at a glance mid-workout |
| `primarySmall` | 18px / 600 | Program name subordinate to workout name |
| `secondary` | 15px / 400, muted | Recedes as the spec requires |
| `sectionLabel` | 12px / 600, 1.4 tracking | Small enough to organise without competing |
| `screenTitle` | 13px / 600, 1.6 tracking | Restrained, per "avoid oversized decorative headings" |
| CTA height | 54pt | Large tap target, drawn from the Hevy reference's primary action |
| Tab icon size | 22pt | The spec says avoid oversized icons |
| Wordmark tracking | 20px / 6pt letter-spacing | Reads as a mark rather than a word |

Two further judgement calls:

**The `REIGN` header is `textPrimary`, not gold.** The spec permits gold for "occasional key
emphasis", and the real wordmark is gold, so gold would have been defensible. Warm white was
chosen because using the brand colour on a text stand-in edges toward imitating the graphic
mark that was explicitly deferred, and because it keeps gold to the two places where it
signals action. This is a one-line change if the other reading is preferred.

**`PlaceholderScreen` exists as a component.** Program, Progress and You are identical, so
three copies of the same markup would have been worse than one component with a prop. It is
the only abstraction in the codebase introduced for reuse rather than because the spec named
the element — consistent with "avoid premature feature-folder abstraction", which was about
directory structure rather than about not sharing a component across three call sites.

---

## What is deliberately absent

Each of these has a specific instruction behind it, not an oversight.

| Absent | Source of the instruction |
|---|---|
| Supabase, authentication, persistence | `CLAUDE.md`: "Do not add Supabase or Apple Health until explicitly instructed" |
| Apple Health integration | Same. The `CARDIO` block is two static strings and calls no health API |
| Analytics | Milestone 1 scope, stated in `CLAUDE.md` and the spec |
| Real workout state | Same. `PrimaryButton`'s `onPress` is optional and unwired |
| Custom fonts | Spec: "Use the native iOS system font for V1. Do not add a custom font yet" |
| Animation libraries, state management, tests | Agreed scope boundary, restated at approval |
| Light theme | "REIGN is dark-only" |
| Exercise list on Today | Spec's Today Screen Rules, and the round 1 correction |
| Rings, scores, streaks, charts, quotes, social | Spec's Today Screen Rules |
| The lion on any screen | Spec: reserve it for high-impact brand moments; "the workout interface should prioritize function over branding" |
| Program, Progress and You content | Milestone 1 is the shell plus Today only |

---

## How the references were used

The spec constrains this: references inform layout, spacing, hierarchy, density and
interaction only, never branding.

**Hevy** contributed four things, all visible in `TodayScreen.tsx`: a quiet date line above a
strong title; a small muted label paired with a stronger value beneath it; flat sections
divided by hairlines instead of nested boxes; and a generous full-width primary action.

Not taken: the blue and green accents, the four-up metric tile grid, the strain score, the
muscle diagrams, the share and social affordances.

**Boostcamp** contributed almost nothing to Milestone 1, which is the honest answer. It
confirmed the bottom tab treatment the spec already described — quiet dark bar, muted
inactive, restrained gold active. Its value is program-browsing information architecture,
which belongs to a later milestone.

Not taken: the filter chips, the PRO affordance, the coach marketplace framing, the ratings
and user counts, its brighter orange-gold.

---

## Still open

Carried forward from the plan, unresolved by design:

1. **A transparent-background wordmark export.** When it arrives, `BrandHeader.tsx` swaps
   its text for an `Image`. Nothing else changes.
2. **A 1024×1024 square app icon and a larger splash asset.** Then `app.json` points at
   `assets/brand/` instead of the template placeholders.
3. **Visual sign-off on an iPhone.** The build sandbox is Linux with no simulator, so the
   code was verified by typecheck, lint, a full iOS Hermes bundle and a dev-server manifest —
   but never seen rendered. The spec calls for review before the workout logging system is
   built.
