# Cassiopeia — CONTRACTS

The single source of truth for the build. **Every agent reads this first.** It defines the stack, data model, design tokens, shared component APIs, file ownership, and the rules of engagement. Companion docs (one level up in the workspace): `Coffee App — Scaffolding & Architecture.md` (the *what*) and `Coffee App — Build Plan for Fable.md` (phases + human-in-the-loop loop) and `Coffee App — Wireframes.html` (the visual reference).

---

## Stack (locked)

- **UI:** Vite + Preact + TypeScript. Preact (~4KB) for the reusable Catalog/Radar and per-tab screens.
- **Styling:** plain CSS with tokens in `src/theme.css`. No CSS framework.
- **Local-first data:** IndexedDB via `idb-keyval`, behind `src/lib/db.ts`.
- **Cloud (later phase):** Supabase (Postgres + Auth + Storage), private, row-level security scoped to the user. Layered behind the same `db.ts` API — tabs never change.
- **iCloud mirror (Phase 6):** `scripts/export_mirror.py` exports the DB to `.xlsx` + `.sqlite` in `iCloud Drive/Cassiopeia/`.
- **Charts:** hand-rolled SVG radar (`src/lib/radar.tsx`). No chart library.
- **AI:** frugal, analysis-points only (Insights summaries, note clustering). Cached; never per-log.

Sized for **1–2 brews/day** → small-data. Do not over-engineer. Images are the only real weight: resize to ~1000px WebP + a thumbnail; lazy-load; full-size on tap.

---

## Data model

TypeScript interfaces live in `src/lib/types.ts` and are the contract. Entities: `Bag, Brew, Rating, Person, BrewIdea, GlobalRecipe, Brewer, Grinder, Appearance`.

Relationships:
```
Bag ─────< Brew >───── Brewer
 │           │  └────── Grinder
 │           │  └────── BrewIdea (optional link)
 │           └────< Rating >──── Person (self or friend)
BrewIdea ──(promote)──> Brew
GlobalRecipe ──(saveRecipeAsIdea, row-copy)──> BrewIdea
```

**Rating axes keep direction — 5 is not always best:**
`flavour/fragrance/sweetness/balance/aftertaste/mouthfeel` 5 = highest · `acidity` 5 = lowest · `bitterness` 5 = lowest · `body` 5 = lightest. Every slider is labeled with its direction. Radar reads scores as-is (a "good" cup is not a big regular polygon — that's expected).

**Two kinds of notes/learnings (don't conflate):** `Brew.notes` + `Brew.learnings` are the **recipe/method** record (captured while brewing — the Brews logger "Recipe" section). `Rating.tastingNotes` + `Rating.learnings` are the **cup** record (captured while tasting — the Brews "Cup"/rating step). `Rating.learnings` was added in Phase 2b; it is additive & optional — Insights/friends radars ignore it.

**Canonical Recipe shape** is shared by `BrewIdea` and `GlobalRecipe`, so save→promote→brew is a row-copy, never a transform.

**Supabase schema (later):** one table per entity mirroring the interfaces; `ratings` FK `brew_id` + `person_id`; RLS `user_id = auth.uid()`. Adding it must not change `db.ts` signatures.

---

## `db.ts` — the only data path

Tabs import `{ db }` from `src/lib/db.ts` and use its async methods (see the `DB` interface there). Never read/write storage directly from a tab. Local-first now; the Supabase adapter is added behind this API later. Foundation implements it with `idb-keyval`; `saveRecipeAsIdea` copies a `GlobalRecipe` into a new `BrewIdea` (same fields).

---

## Design tokens & theme (`src/theme.css`)

Aurora frosted-glass. Dark + light via `<html data-mode>`. **Per-tab hue** via a `hue-<tab>` class on the screen root (sets `--a1/--a2` + the `.body` aurora background). Palette (Pantone-derived) and hue pairs are defined in `theme.css` — use the CSS variables, never hardcode hex in components.

- Shared primitives already in `theme.css`: `.glass`, `.glass.hero`, `.btn`, `.btn.ghost`. Tabs extend, never redefine.
- **Appearance control:** `Appearance.mode` (dark/light) and `Appearance.hueMode` (`uniform` | `perTab`). Uniform sets `--u1/--u2` on `:root` and adds `html.uniform-hue`; per-tab uses the `hue-*` classes. Persist locally.
- Default mode = **dark**.

---

## Shared components (contract props; Foundation implements)

- `Radar` (`src/lib/radar.tsx`) — `RadarProps { series: {name,color,scores}[], size? }`. One polygon per person in their colour; grid rings 1..5; axis labels with direction.
- `Catalog` (`src/lib/catalog.tsx`) — `CatalogProps { facets, activeFacet, items, onOpen, onQuickSave?, onFacetChange? }`. ONE component powers Recipes' Coffee Pros / Brewers / Styles / Roasters. Row `+` = `onQuickSave` (quick-save to ideas); tapping a row = `onOpen` (drill in); tapping a chip = `onFacetChange` (parent swaps `items`) — *added in Foundation; Recipes agent take note*. Adding a facet/entry is data, not UI.

---

## Navigation

`src/nav.config.ts` lists the 7 tabs (order = FAB stack order) with `enabled` flags. The **liquid FAB** (collapsed `+` → vertical expanding stack of circular tab buttons, `+`→`×`, gooey merge) and the router both read it. Adding a tab = one entry.

**How a tab ships (Foundation mechanism):** `main.tsx` lazy-loads `src/tabs/<id>/index.tsx` and renders its **default export** as the screen (inside `.screen.hue-<id> > .body`, heading already provided). Until a tab default-exports a component, a Foundation fallback raw-list renders. Tab agents therefore never touch `main.tsx` — just add `export default function <Tab>Screen() {…}` in their folder.

---

## Screens (see wireframes v3)

Home · Brews (logger, daily core) · Bags (finished/frozen/peak toggles) · Ideas · Recipes (list with row `+`; pro → recipes → **recipe detail with Save to brew ideas**) · Insights (radar + trends + AI summary) · **Wrapped** (detailed year-in-review: roasters, region, bags, grams, origins, varieties, processes, notes, decaf %, days-since-first-bag, recipes, month timeline + photos) · Settings (brewers, grinders, people+colors, appearance, sync, import, mirror, AI).

---

## File ownership map

- **Contract-owned (read-only for tab agents):** `theme.css`, `nav.config.ts`, `lib/types.ts`, `lib/db.ts`, `lib/radar.tsx`, `lib/catalog.tsx`, `lib/import.ts`, `main.tsx`, `router.ts`, `seed/*`, this file.
- **Per-tab agents own exactly one folder:** `src/tabs/<home|brews|bags|ideas|recipes|insights|settings>/`.
- Insights owns both the overview and the Wrapped subview.

## Phase order (from the Build Plan)

0 Contracts (this file + skeleton — done) → 1 Foundation (implement `db.ts`, components, `main`/router, theme wiring, import) — **sequential, not parallel** → (2a Bags ∥ 2b Brews) → 3 Home → 4 Insights+Wrapped → (5a Ideas ∥ 5b Recipes) → 6 Friends + PWA + Supabase + iCloud mirror.

## Agent rules of engagement

1. Read this file first. Stay inside your assigned folder. Treat contract-owned files as read-only.
2. Only touch data via `db.ts`; only colours via theme variables.
3. Leave the app runnable at every stop; report the acceptance checks for your phase.
4. Ask (via the integration owner) before changing any shared contract — if a contract must change, update this file and note who must re-read.
5. Prefer small diffs over rewrites. Keep it lightweight (small-data app).
