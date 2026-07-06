# Cassiopeia — session handoff & progress tracker

*Last updated: 2026-07-06 (morning), just before the Phase 2 fan-out was due to launch.
This is THE resume doc — read it with `CONTRACTS.md` (contracts) and `README.md` (overview).
To resume, tell Claude: **"Read HANDOFF.md and start/continue the fan-out."***

## Progress tracker

| # | Item | Status | Notes |
|---|------|--------|-------|
| 0 | Contracts + skeleton | ✅ done | |
| 1 | Foundation (db, radar, catalog, shell, FAB, theme, import) | ✅ done | polished after user feedback: clickable fallbacks, FAB spacing, 7 distinct hues |
| 1b | App logo + icons | ✅ done | bubble extracted with true alpha (`Logo-bubble.png`), favicon/PWA/iOS icons in `public/` |
| 2a | **Bags tab agent** | 🔜 NOT STARTED | wave 1, parallel with 2b — brief below |
| 2b | **Brews tab agent** | 🔜 NOT STARTED | wave 1, parallel with 2a — brief below |
| 3 | Home tab agent | ⏳ waits on wave 1 | |
| 4 | Insights + Wrapped agent | ⏳ waits on 3 | |
| 5a/5b | Ideas ∥ Recipes agents | ⏳ waits on 4 | |
| 6 | Friends + PWA + Supabase + iCloud mirror | ⏳ last | icons ready for manifest |

**Every tab currently renders a Foundation fallback screen** (raw-but-clickable lists,
expandable rows, working radar/catalog/theme demos). The real internal pages are exactly
what Phases 2–5 build, one agent per `src/tabs/<id>/` folder.

Git: repo on `main`, clean at last update — commits `2a553ea` (Foundation), `48f2c5a`
(logo), `fd02e24` (bubble extraction). User sign-off given for wave 1 fan-out.

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

### Wave-1 agent briefs (ready to use)

**Bags (2a)** — bag cards with photo + all fields; add/edit form; finished / frozen
(reveals amount + freeze date) / peak-window toggles; photo upload resized to ~1000px
WebP + thumbnail (store as data-URL string in `Bag.photo`; seed rows may hold plain
filenames → resolve to `/photos/<name>`, missing files = text-only card).
Photo files: `../coffee-app/photos/` has only `PHOTO_MANIFEST.txt` (expected filenames);
actual photos not yet supplied by user — build the upload path, don't block on files.
Acceptance: finished bags vanish from Brews' coffee dropdown (via `listBags()` default),
frozen fields persist, thumbnails in grid, full-size on tap.

**Brews (2b)** — the daily logger: dropdowns fed by `listBags()` (excludes finished),
brewers, grinders; all Brew fields; 9 rating sliders **each labeled with its direction**
(see RATING_AXES); tasting-note words; notes/learnings; per-brew radar via `lib/radar.tsx`.
Acceptance: a full brew + rating logs and persists offline (reload survives), radar
renders the reversed axes correctly.

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
