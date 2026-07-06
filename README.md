# Cassiopeia

Personal coffee brew tracker — a lightweight dark/light aurora PWA for iPhone + Mac. Log daily brews, rate them on 9 axes (with friends), track bags, borrow recipes, and see insights + a yearly "Coffee Wrapped."

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

Vite + Preact + TypeScript · plain CSS tokens (`src/theme.css`) · IndexedDB (`idb-keyval`) local-first · Supabase added later behind `src/lib/db.ts` · hand-rolled SVG radar. No CSS/chart frameworks. Sized for 1–2 brews/day (small-data).

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
    db.ts             the ONLY data path (local-first → Supabase)     [contract-owned]
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
3. Then fan out **one agent per tab** in git worktrees: `(bags ∥ brews) → home → insights+wrapped → (ideas ∥ recipes) → friends/PWA/Supabase/mirror`.
4. Each agent: reads `CONTRACTS.md`, stays in its `tabs/<x>/` folder, uses `db.ts` + theme vars only, leaves the app runnable, reports acceptance checks.
5. The integration owner (Opus/main thread) merges worktrees, runs the app, and gates each phase on your review. Nothing merges without your sign-off.

## Existing data to import (one level up in the workspace)

`Coffee Bags.xlsx` (Bags + Brewers sheets) · `Brew Ideas.xlsx` · `My Coffee Brews.csv`. `import.ts` seeds the local DB from these on first run (via pre-converted JSON in `/public`).
