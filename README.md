# REIGN

Personal iPhone-first strength and cardio training app.

Dark-only. No fluff, proven training, fast workout logging, progressive overload.

## Status — Milestone 1

The four-tab shell and a static Today screen. Nothing else.

There is no database, authentication, Apple Health integration, persistence,
workout state or analytics. All workout, program and cardio content is static
mock data in `src/data/today.ts`. The Today screen's date is the live device
date and is display-only.

## Stack

| | |
|---|---|
| Expo SDK | 54 (`expo` 54.0.37) |
| React Native | 0.81.5 |
| React | 19.1.0 |
| Router | `expo-router` 6.0.24 (file-based, typed routes) |
| Language | TypeScript 5.9.3, strict |

Dependencies are pinned to exact versions so a fresh install cannot drift off
SDK 54. The App Store build of Expo Go must be on SDK 54 to open this project.

## Running

```
npm install
npm start
```

Scan the QR code with Expo Go on an iPhone. There is no Mac-only step for
Milestone 1.

## Checks

```
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npx expo-doctor
```

## Layout

```
app/                    expo-router routes; thin adapters only
  _layout.tsx           root stack, pinned dark navigation theme
  (tabs)/_layout.tsx    Today · Program · Progress · You
src/
  theme/                design tokens — colors, spacing, radius, typography
  components/           shared UI primitives
  screens/              screen composition
  data/                 static mock data
assets/brand/           approved REIGN brand assets
docs/design/            UI specification and reference images
```

## Design authority

`docs/design/REIGN_UI_SPEC.md` is the visual source of truth, with the approved
assets in `assets/brand/` and references in `docs/design/references/`. Do not
independently redesign REIGN. See `CLAUDE.md`.
