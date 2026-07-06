# Cassiopeia — session handoff

*Last updated: 2026-07-06, after the Foundation polish round. This file is the warm-start
for the next Claude Code session — read it together with `CONTRACTS.md` (contracts) and
`README.md` (status). Delete sections as they become stale.*

## Where we are

**Phase 1 (Foundation) is complete, polished, and verified in the browser.** Dark + light,
7 distinct tab hues, liquid FAB, hash router, IndexedDB via `db.ts`, first-run import done
(52 bags / 6 brews+ratings / 11 ideas / 4 recipes / 9 brewers / 1 grinder / self person).
`tsc` clean, `vite build` ~13 kB gzip. Phase 2 fan-out has NOT started.

## How to run

```bash
npm run dev   # http://localhost:5173  (Node v22 at ~/.local/node if not on PATH)
```

To regenerate `public/seed-data.json` from the workspace xlsx/csv (one level up):
`python3 scripts/convert_seed.py` — needs openpyxl (use a venv; system python3 lacks it).

## Key mechanisms the next session must know

- **Tabs ship via default export**: `main.tsx` lazy-loads `src/tabs/<id>/index.tsx`; a tab
  agent just adds `export default function Screen() {…}`. Until then `src/fallback.tsx`
  (Foundation-owned, temporary) renders that tab's raw-but-clickable screen.
- **Appearance loop**: `db.setAppearance()` dispatches `APPEARANCE_EVENT`; the shell in
  `main.tsx` listens and re-applies `<html data-mode>` / `uniform-hue` / `--u1,--u2`.
- **`CatalogProps.onFacetChange?`** was added to the contract (chips had no change callback).
- **FAB tuning**: stack spacing 74px, goo blur stdDeviation 5 (`app.css` + `GooFilter` in
  `main.tsx`). Circles must NOT touch at rest; goo shows only during transit.
- Import is idempotent (seeds only when bags+brews+ideas are all empty). To re-import:
  DevTools → Application → IndexedDB → delete `cassiopeia` DB → reload.

## Data judgment calls already made (don't re-litigate)

- Bags xlsx: **bold coffee-name = active bag**, everything else imported `finished: true`.
  Col C font colour → `Bag.color` legend. Frozen = Frozen Serves / Freeze Date present.
- CSV `Method` → brewer heuristic: "flat*"→Flatground, "*switch*"→V60 Switch, "*v60*"→V60.
- `NEEDS_CONFIRMATION` rating cells are skipped (that's why the 2026-06-04 radar is sparse).
- Brew Ideas' "Why / effect" column is appended into `steps` as a `Why:` line (BrewIdea has no `why`).

## Next steps (user-approved plan)

1. User signs off on Foundation (booted + reviewed).
2. Fan out **one Fable agent per tab in git worktrees**:
   `(bags ∥ brews) → home → insights+wrapped → (ideas ∥ recipes) → friends/PWA/Supabase/mirror`.
   Each agent: reads CONTRACTS.md, owns only `src/tabs/<x>/`, data via `db.ts` only,
   colours via theme vars only, reports acceptance checks. Integration owner merges + gates.
3. Known deferred items: brew logger CTA (Brews agent, 2b), Home peak-window flags (3),
   Wrapped (4), pro names in Recipes fallback show raw ids (Recipes agent, 5b), photo
   files for bags not yet copied into the app (Bags agent, 2a).
4. App logo: `Logo.png` (repo root, 2048², source asset). Derived icons live in `public/`
   (favicon.png 32, icon-192/512 transparent, apple-touch-icon.png 180 flattened onto
   #08070A) and are linked from index.html. The Phase 6 PWA agent should reference
   icon-192/512 in the manifest (mark 512 maskable after checking safe-zone padding).

## Open questions for the user

- None blocking. Radar direction labels and reversed axes were user-specified and verified.
