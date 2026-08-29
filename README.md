# REIGN

Personal strength and cardio training app, built as a web app you add to your
iPhone home screen.

Dark-only. No fluff, proven training, fast workout logging, progressive overload.

## Status

The project was rebuilt as a web app. Before this, it was a native iPhone app
built with Expo and React Native; that version is still in the git history and
is described in `docs/MILESTONE_1_CODE.md` and `docs/MILESTONE_1_RATIONALE.md`.

Right now this is a fresh, working Next.js starter. The REIGN design has not
been built on top of it yet.

## Stack

| | |
|---|---|
| Framework | Next.js 16.3.3 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Runtime | React 19.2.8 |

## Running it on Windows

You need Node.js installed (version 20 or newer). Then, in a terminal opened in
this folder:

```
npm install
npm run dev
```

The first command downloads everything the project needs, and only has to be
run once (or again after the project's dependencies change). The second starts
the app. Leave it running, and open <http://localhost:3000> in your browser.

To stop it, press `Ctrl + C` in that terminal.

### Seeing it on your iPhone

Both your PC and your iPhone need to be on the same Wi-Fi network. Start the
app with:

```
npm run dev -- --hostname 0.0.0.0
```

Find your PC's local network address by running `ipconfig` and looking for the
`IPv4 Address` (it usually looks like `192.168.x.x`). On your iPhone, open
Safari and go to `http://YOUR-ADDRESS:3000`. To add it to your home screen, tap
the Share button, then "Add to Home Screen".

## Other commands

```
npm run build     # make the optimised version, and check for errors
npm run start     # run that optimised version
npm run lint      # check the code for common mistakes
npx tsc --noEmit  # check the code's types (run npm run build first)
```

## What's in here

```
src/app/          the pages; page.tsx is the home page
src/app/layout.tsx  the shared wrapper around every page
src/app/globals.css styles that apply everywhere
public/           images and files served exactly as they are
assets/brand/     approved REIGN brand assets
docs/design/      the UI specification and reference screenshots
docs/             records of the previous React Native build
```

## Design authority

`docs/design/REIGN_UI_SPEC.md` is the visual source of truth, with the approved
assets in `assets/brand/` and references in `docs/design/references/`. Do not
independently redesign REIGN. See `CLAUDE.md`.

Note that the specification and `CLAUDE.md` were written for the React Native
version and still refer to it in places. The design direction — dark-only, the
colours, the spacing, the Today screen layout — still applies. The technology
sections do not.
