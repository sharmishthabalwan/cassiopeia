# Cassiopeia — session handoff & progress tracker

*Last updated: 2026-07-09. Brews tab complete + merged; deployed to Pages.
This is THE resume doc — read it with `CONTRACTS.md` (contracts) and `README.md` (overview).

## Progress tracker

| # | Item | Status | Notes |
|---|------|--------|-------|
| 0 | Contracts + skeleton | ✅ done | |
| 1 | Foundation (db, radar, catalog, shell, FAB, theme, import) | ✅ done | clickable fallbacks, FAB spacing, 7 distinct hues |
| 1b | App logo + icons | ✅ done | true-alpha bubble (`Logo-bubble.png`), icons in `public/` |
| 1c | Publish: GitHub repo + Pages deploy | ✅ done | live at sharmishthabalwan.github.io/cassiopeia; Actions auto-deploy on push to main |
| resp | Desktop responsive | ✅ merged | wide column + grids + FAB hover. KNOWN GAP: aurora gradient is phone-width in the 561–767px tablet band (fix: unify `.screen .body` to always full-width + centered-column padding in app.css) |
| 2b | **Brews tab** | ✅ DONE + merged | F1 list · F2 detail+radar · F3 logger · F4 9-slider ratings (direction-labeled, as-is) · F5 edit+empty states. Verified end-to-end: log→rate→persist→reload→edit; scores stored un-inverted. Branch `brews` merged to main (not yet pushed pending user test). |
| 2a | **Bags tab** | 🟡 F1–F4 done | list, detail, add/edit, state toggles+peak — committed on branch `bags`, NOT merged. **F5 photo upload (canvas→WebP + thumb) NOT built.** Render path (`photoSrc`/`BagPhoto`) already exists. Finish F5, verify, merge. |
| 3 | Home tab | ⏳ next after bags | |
| 4 | Insights + Wrapped | ⏳ | |
| 5a/5b | Ideas ∥ Recipes | ⏳ | |
| 6 | Friends + PWA + Supabase + iCloud mirror | ⏳ last | icons ready for manifest |

**Deferred UI polish (user-requested, not yet done):**
- Aurora gradient tablet-gap fix (see resp row above) — small app.css change.
- **FAB feels bare on desktop.** User wants alternatives researched (done: navigation
  rail is the recommended desktop pattern — narrow vertical icon+label sidebar that the
  FAB anchors to the top of; bottom bar/FAB are discouraged on desktop). Proposal: keep
  the liquid FAB on mobile (`hover:none`), swap to a left navigation rail on desktop
  (`min-width:1100px`) reading the same `nav.config.ts`.
- **Persistent top-left Cassiopeia logo** (transparent `Logo-bubble.png`) that links to
  Home — on every tab. Would live in the app shell (`main.tsx` + `app.css`).

Git: repo on `main`. Tab agents commit per-feature inside `worktrees/<tab>/`; the
integration owner (main session) reviews, commits any finished-but-uncommitted work,
merges, verifies, and gates pushes on the user's test. Branch `bags` still unmerged.
Workflow note: the two wave-1 agents each hit the **monthly spend cap** mid-task (billing,
not code) — per-feature commits meant no work was lost.

## Fan-out procedure (approved plan)

Spawn one Fable agent per tab, `isolation: worktree`, waves:
`(bags ∥ brews) → home → insights+wrapped → (ideas ∥ recipes) → friends/PWA/Supabase/mirror`.
Integration owner (main session) reviews each agent's diff, merges the worktree, runs the
app, and gates the next wave on the user's review.

Every agent brief must include: read `/CONTRACTS.md` + `/HANDOFF.md` first; own ONLY
`src/tabs/<id>/`; ship by **default-exporting the screen component** from
`src/tabs/<id>/index.tsx` (main.tsx lazy-loads it — never edit main.tsx); data via
`db.ts` only; colours via theme vars only; `npm install` in the worktree, verify with
`npx tsc --noEmit` + `npm run build`; don't start a dev server on port 5173 (integration
session may hold it); report acceptance checks; if a contract must change, STOP and
report back instead of editing contract-owned files.

### Delivery model (user-specified)

- **Parallelism across tabs, features within a tab.** One agent owns one tab folder;
  inside its chat it works through the ordered feature checklist below. Never split one
  tab across parallel agents (same-folder collisions).
- **Each feature = one small deliverable**: app runnable after it, one git commit in the
  worktree per feature (`bags: F2 bag detail` style). Review/merge is possible mid-tab.
- Phase 6 (friends, PWA, Supabase, iCloud mirror) is cross-cutting → done LAST,
  sequentially, by the main/integration agent. Not a sub-agent task.

### Wave-1 agent briefs (ready to use)

**Bags (2a)** — feature checklist, in order:
1. **F1 Bag list** — replace the fallback: card grid of all bags (name, roaster, colour
   legend dot, finished/frozen badges); finished bags visually muted; sensible sort.
2. **F2 Bag detail** — tap a card → full detail view with all ~20 fields in a sane
   hierarchy (hero: name/roaster/photo; then origin block, roast block, freezer block).
3. **F3 Add / edit bag** — form for all fields, validation-light, `upsertBag` via db.
4. **F4 State toggles** — finished, frozen (reveals amount + freeze date), peak-window
   display (derived from roastDate). Acceptance: finished bags vanish from Brews'
   coffee dropdown (`listBags()` default already excludes them); frozen fields persist.
5. **F5 Photos** — upload → resize ~1000px WebP + thumbnail (canvas), stored as data-URL
   in `Bag.photo`; thumbnails in grid, full-size on tap; seed rows holding plain
   filenames resolve to `/photos/<name>`, missing file = text-only card. Photo files
   aren't in the workspace yet (`../coffee-app/photos/PHOTO_MANIFEST.txt` lists the 31
   expected names) — build the path, don't block on the files.

**Brews (2b)** — feature checklist, in order:
1. **F1 Brew log list** — replace the fallback: reverse-chron list, each row date /
   coffee / brewer / dose chip.
2. **F2 Brew detail** — tap a row → every Brew field + the per-brew radar
   (`lib/radar.tsx`) of its ratings.
3. **F3 New brew form** — dropdowns fed by `listBags()` (excludes finished), brewers,
   grinders; all logger fields (filter, dose, water, temp, time, grind, pour technique,
   notes, learnings); roastDate auto-fills from the picked bag; save → appears in list.
4. **F4 Ratings** — 9 sliders **each labeled with its direction** (RATING_AXES),
   0.5 steps, tasting-note words; saves as the self Person's Rating; live radar preview
   while sliding. Acceptance: full brew + rating survives a reload (IndexedDB), radar
   renders reversed axes as-is.
5. **F5 Edit + polish** — edit an existing brew/rating, empty states, `tsc`/build clean.

## Key mechanisms (unchanged from Foundation)

- Tabs ship via default export; fallback screens live in `src/fallback.tsx` (Foundation-owned).
- `db.setAppearance()` dispatches `APPEARANCE_EVENT`; shell re-themes. Default: dark, per-tab hues.
- `CatalogProps.onFacetChange?` exists (added in Foundation; Recipes agent take note).
- FAB: spacing 74px, goo blur stdDeviation 5 — circles must not touch at rest.
- Import is idempotent (seeds only when bags+brews+ideas all empty). Re-import: delete the
  `cassiopeia` IndexedDB in DevTools → reload. Regenerate seed JSON: `scripts/convert_seed.py`
  (needs openpyxl venv; system python3 lacks it).
- Dev server: `npm run dev` → :5173 (Node v22 at `~/.local/node` if not on PATH). Preview
  launch config: `/Users/mauve/Claude-Banana/.claude/launch.json`.

## Data judgment calls already made (don't re-litigate)

- Bags xlsx: bold coffee-name = active bag; others `finished: true`. Col C font colour →
  `Bag.color`. Frozen = Frozen Serves / Freeze Date present.
- CSV Method → brewer heuristic: flat*→Flatground, *switch*→V60 Switch, *v60*→V60.
- `NEEDS_CONFIRMATION` rating cells skipped (2026-06-04 radar is sparse on purpose).
- Brew Ideas "Why / effect" column appended into `steps` as a `Why:` line.
- Logo: source `Logo.png` had checkerboard baked in; `Logo-bubble.png` is the true-alpha
  extraction (dual-background matting). Icons derive from the bubble.

## Open questions for the user

- Bag photos: 31 files listed in `../coffee-app/photos/PHOTO_MANIFEST.txt` are not yet
  in the workspace — drop them there (or into `public/photos/`) when convenient.
