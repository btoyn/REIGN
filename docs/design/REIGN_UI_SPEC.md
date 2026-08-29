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

Use the native iOS system font for V1.

Do not add a custom font yet.

General hierarchy:

### Display
Used sparingly for major metrics.

- large
- bold or semibold
- high contrast

### Screen Title
Examples:
- TODAY
- PROGRAM
- PROGRESS

Use strong hierarchy but avoid oversized decorative headings.

### Primary Content
Examples:
- PUSH A
- Incline Barbell Bench
- Bigger Leaner Stronger

### Secondary Content
Examples:
- Week 6 · Day 4
- Yesterday · 49 min
- 5 exercises · ~52 min

Secondary text should visually recede.

Uppercase is acceptable for small section labels and primary CTAs.

Do not uppercase all interface text.

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

Use Expo-compatible system-style icons when needed.

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

## Information Hierarchy

Top area:

- small REIGN wordmark or restrained REIGN brand treatment
- current date

Then:

### TODAY

Primary workout block:

- `PUSH A`
- `Bigger Leaner Stronger`
- `Week 6 · Day 4`
- `5 exercises · ~52 min`

Primary CTA:

`START WORKOUT`

Then secondary information:

### LAST WORKOUT

- `Pull A`
- `Yesterday · 49 min`

Then:

### CARDIO

- `Apple Health`
- `No cardio recorded today`

Cardio will later reflect imported Apple Watch / Apple Health workouts.

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

# Active Workout Direction

This is not part of Milestone 1, but future implementation should follow these principles.

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

# Milestone 1

The first implementation should include only:

- Expo SDK 54 project
- TypeScript
- expo-router
- dark-only theme
- four-tab navigation
- polished static Today screen
- approved REIGN brand assets

Use static mock data.

Do not add:

- Supabase
- authentication
- Apple Health
- persistence
- workout state
- analytics
- additional features

The visual result should be reviewed before building the workout logging system.
