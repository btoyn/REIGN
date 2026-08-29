# REIGN — Claude Project Instructions

## Product

REIGN is a personal iPhone-first strength and cardio training app.

Core philosophy:

- No fluff.
- Proven training.
- Fast workout logging.
- Progressive overload.
- Show up consistently and become stronger and more capable.

REIGN is not a social fitness network.

## Core V1

Primary navigation:

1. Today
2. Program
3. Progress
4. You

Users can eventually:

- follow a proven workout program
- build a custom workout
- log sets, reps, and weight
- see previous performance
- track progression
- substitute exercises
- view workout history and PRs
- import Apple Health cardio workouts

## Explicitly Out of Scope Unless Specifically Requested

Do not add:

- social feeds
- followers
- nutrition or macros
- AI-generated random workouts
- challenges
- badges
- game currency
- inspirational quotes
- recovery scores
- trainer marketplace
- unnecessary dashboards
- extra features not present in the approved specification

## Technology

- React Native
- Expo SDK 54
- TypeScript
- expo-router
- Supabase later
- Apple Health later
- GitHub source control

Do not add Supabase or Apple Health until explicitly instructed.

## Design Authority

Do not independently redesign REIGN.

The visual source of truth is:

- `assets/brand/`
- `docs/design/REIGN_UI_SPEC.md`
- `docs/design/references/`

Reference screenshots are for layout, spacing, information hierarchy, density, and interaction patterns only.

Do not copy competitor branding.

## Brand

REIGN is dark-only.

The approved identity uses:

- near-black backgrounds
- dark charcoal surfaces
- warm white text
- restrained muted gold accents
- geometric black-and-gold lion branding

Use the supplied brand assets.

Never recreate the lion in CSS, SVG, text, or generated graphics.

Do not alter, redraw, reinterpret, or replace the supplied logo.

## Design Principles

The interface should feel:

- premium
- restrained
- strong
- calm
- capable
- simple
- highly legible during a workout

Avoid:

- neon colors
- excessive cards
- unnecessary icons
- giant dashboard grids
- decorative charts
- visual clutter
- bodybuilding clichés
- random gradients
- invented features

Gold is an accent, not the dominant interface color.

## Terminology

Use:

- Workout
- START WORKOUT
- Last Workout
- Program
- Progress

Do not substitute "Session" for "Workout" unless specifically requested.

## Working Rules

Before implementing a new screen:

1. Read the current specification under `docs/design/`.
2. Inspect the supplied reference images.
3. Use existing theme tokens.
4. Do not invent new product features.
5. Ask when a product or design decision is genuinely unspecified.
6. Prefer the simplest implementation that satisfies the approved design.
7. Do not over-engineer early-stage screens.

## Current Milestone

Do not build the whole app.

The first implementation milestone is:

- the four-tab shell
- a static Today screen using the approved REIGN design

Do not add:

- database
- authentication
- Apple Health
- analytics
- real workout state
- extra features

until explicitly instructed.
