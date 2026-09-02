# <img src="Logo-bubble.png" width="40" alt="" align="top"> Sam Caffeinated

Personal coffee brew tracker — a lightweight dark/light aurora PWA for iPhone + Mac. Log daily brews, rate them on 9 axes (with friends), track bags, borrow recipes, and see insights + a yearly "Coffee Wrapped."

**Live demo → [sharmishthabalwan.github.io/cassiopeia](https://sharmishthabalwan.github.io/cassiopeia/)** · seeded with my real brew journal · local-first IndexedDB, with optional Firebase Cloud Storage sync so the same account sees the same cups on iPhone and Mac

Built with [Claude Code](https://claude.com/claude-code) using a contracts-first, multi-agent workflow: a Foundation phase lays down the data layer, shared components and app shell, then one agent per tab builds its screen inside a git worktree against [`CONTRACTS.md`](./CONTRACTS.md). Progress log: [`HANDOFF.md`](./HANDOFF.md).

> **Read [`CONTRACTS.md`](./CONTRACTS.md) before writing any code.** It's the source of truth for schema, tokens, components, file ownership, and phase order.

## Status

Phase 1 (Foundation) complete: `db.ts` (idb-keyval), `radar.tsx`, `catalog.tsx`, `main.tsx` + hash router + liquid FAB, appearance wiring (dark/light, uniform/per-tab hue), and first-run import from `public/seed-data.json` (emitted by `scripts/convert_seed.py` from the workspace xlsx/csv). Tabs render Foundation fallback raw-list screens until each tab agent lands its default export (see CONTRACTS.md §Navigation). Next: (2a Bags ∥ 2b Brews).

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

The app boots to a placeholder until Foundation is built.

## Stack

Vite + Preact + TypeScript · plain CSS tokens (`src/theme.css`) · IndexedDB (`idb-keyval`) local-first · Firebase Auth + Cloud Storage snapshot behind `src/lib/db.ts` · hand-rolled SVG radar. No CSS/chart frameworks. Sized for 1–2 brews/day (small-data).

## Layout

```
CONTRACTS.md          source of truth (read first)
index.html
src/
  main.tsx            entry (Foundation)
  router.ts           hash router (Foundation)
  theme.css           design tokens — aurora, palette, per-tab hues  [contract-owned]
  nav.config.ts       7-tab registry + FAB order                     [contract-owned]
  lib/
    types.ts          data model + rating axes (with direction)      [contract-owned]
    db.ts             the ONLY data path (local-first → Firebase)     [contract-owned]
    journal.ts        cloud snapshot shape + merge                    [contract-owned]
    firebase.ts       Auth + Cloud Storage                            [contract-owned]
    sync.ts           pull/push journal snapshot                      [contract-owned]
    radar.tsx         shared SVG radar                                [contract-owned]
    catalog.tsx       generic catalog (pros/brewers/styles/roasters)  [contract-owned]
    import.ts         first-run import of existing data               [contract-owned]
  tabs/<tab>/         one folder per tab                              [each owned by its agent]
seed/                 brewers, grinders, coffee-pros, recipes (JSON)
scripts/export_mirror.py   iCloud mirror export (Phase 6)
```

## Building with Fable agents (in Claude Code)

1. Open this folder in Claude Code.
2. **Foundation first, sequentially** (do not parallelize): implement `db.ts`, `radar.tsx`, `catalog.tsx`, `main.tsx`, `router.ts`, theme wiring, and `import.ts`. Point the agent at `CONTRACTS.md`.
3. Then fan out **one agent per tab** in git worktrees: `(bags ∥ brews) → home → insights+wrapped → (ideas ∥ recipes) → friends/PWA/mirror`.
4. Each agent: reads `CONTRACTS.md`, stays in its `tabs/<x>/` folder, uses `db.ts` + theme vars only, leaves the app runnable, reports acceptance checks.
5. The integration owner (Opus/main thread) merges worktrees, runs the app, and gates each phase on your review. Nothing merges without your sign-off.

## Existing data to import (one level up in the workspace)

`Coffee Bags.xlsx` (Bags + Brewers sheets) · `Brew Ideas.xlsx` · `My Coffee Brews.csv`. `import.ts` seeds the local DB from these on first run (via pre-converted JSON in `/public`).

## Cloud sync (Firebase)

A brew you log is stored in **this browser’s IndexedDB**. Opening the GitHub Pages app on another phone, laptop, or even another browser profile starts a fresh database (seed journal only) — so a 31 Aug cup you saved “here” will not appear “there” until both sides sign into the same Firebase account.

Once you sign in (Settings → Cloud journal):

1. This device uploads `users/{yourUid}/journal.json` to **Firebase Cloud Storage** (bags, brews, ratings, ideas, recipes, gear, people, appearance).
2. The other device signs in with the same email/Google account, downloads that snapshot, and **merges by id** (a brew that exists on only one side is kept).
3. Later edits debounce-upload; returning to the tab pulls again.

### One-time Firebase project setup

1. Create a project at [Firebase console](https://console.firebase.google.com/) and register a **Web** app.
2. Authentication → Sign-in method → enable **Email/Password** (and **Google** if you want that button).
3. Authentication → Settings → Authorized domains → add `localhost` and `sharmishthabalwan.github.io`.
4. Build → Storage → Get started (production mode is fine — we ship rules).
5. Deploy rules from this repo:

```bash
npx firebase-tools login
npx firebase-tools use --add   # select your project
npx firebase-tools deploy --only storage
```

6. Copy the web app config into `.env.local` (see `.env.example`).
7. For GitHub Pages, add the same `VITE_FIREBASE_*` values as repository **Secrets**. The deploy workflow bakes them into the static build.

The API key in a web app is public by design. Access control is the Storage rule: only `request.auth.uid` can read or write `users/{uid}/journal.json`.
