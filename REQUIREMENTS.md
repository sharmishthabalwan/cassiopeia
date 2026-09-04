# Sam Caffeinated — Functional Requirements

Personal coffee brew tracker (repo: **cassiopeia**). Lightweight Material Design 3 web app for iPhone and Mac: log daily brews, rate them on nine axes (optionally with friends), track bags, borrow recipes, and review insights plus a yearly “Coffee Wrapped.”

This document is the functional-requirements inventory for the **whole product**, including capabilities already shipping and capabilities specified in [`CONTRACTS.md`](./CONTRACTS.md) / [`HANDOFF.md`](./HANDOFF.md) that are not fully built yet. Design tokens, file ownership, and agent process live in those companion docs; this file answers *what the product must do for a user*.

| Field | Value |
|---|---|
| Product name | Sam Caffeinated |
| Primary user | A single home barista logging ~1–2 brews per day |
| Platforms | Mobile web (iPhone) and desktop web (Mac); later a PWA |
| Data posture | Local-first (IndexedDB in the browser). No backend required for core use. |
| Companion docs | [`CONTRACTS.md`](./CONTRACTS.md) (schema, tokens, APIs), [`HANDOFF.md`](./HANDOFF.md) (build status), [`README.md`](./README.md) |

**Status legend**

| Tag | Meaning |
|---|---|
| **Shipped** | Implemented in the current app (Bags and Brews tabs, Foundation shell). |
| **Fallback** | Specified and partly exercised by a Foundation raw-list screen; dedicated tab UI not shipped. |
| **Planned** | Specified in contracts / handoff; not yet implemented. |

Each requirement is uniquely IDed (`FR-xx-nn`) so later work can trace to it.

---

## 1. Actors

| Actor | Description |
|---|---|
| Owner | The person whose journal this is. Identified as the `Person` with `isSelf`. Logs brews, rates cups, manages bags, recipes, ideas, and settings. |
| Friend | Another `Person` who may taste and rate the same brew. Friend ratings overlay the owner’s radar. Friend capture is planned (Phase 6); the data model already supports it. |
| System | The client app: router, IndexedDB, first-run seeder, theme engine, parsers. |

There is no multi-tenant admin, no public social feed, and no unauthenticated “browse others’ journals” role.

---

## 2. Product overview

Seven primary destinations, in nav order:

1. **Home** — dashboard into today’s coffee life.
2. **Brews** — daily logger: list, detail, upload/paste log, form, ratings.
3. **Bags** — inventory of coffee bags (open / frozen / finished) with peak window and photos.
4. **Ideas** — personal brew ideas (recipes the owner intends to try or has tried).
5. **Insights** — trends, radar, AI summary; plus **Wrapped** year-in-review.
6. **Recipes** — catalog of global recipes from coffee pros / brewers / styles / roasters, saveable as ideas.
7. **Settings** — gear, people, appearance, sync, import, mirror, AI.

Canonical flow: **internet recipe → brew idea → brew → cup rating**. Recipe fields are a shared shape so that path is a row-copy, not a transform.

---

## 3. Cross-cutting functional requirements

### 3.1 App shell and navigation

| ID | Requirement | Status |
|---|---|---|
| FR-NAV-01 | The app SHALL present seven tabs — Home, Brews, Bags, Ideas, Insights, Recipes, Settings — in that order. | **Shipped** |
| FR-NAV-02 | Each tab SHALL be individually enableable (`enabled` flag). Disabled tabs SHALL NOT appear in navigation or be routable. | **Shipped** |
| FR-NAV-03 | Compact viewports SHALL use a bottom navigation bar. Medium and expanded viewports (≥768px) SHALL use a left navigation rail. | **Shipped** |
| FR-NAV-04 | The active tab SHALL be visually indicated (filled icon, indicator pill). | **Shipped** |
| FR-NAV-05 | Routing SHALL be hash-based (`#/<tabId>`). Unknown or disabled hashes SHALL fall back to Home. | **Shipped** |
| FR-NAV-06 | Tapping the app logo (compact top bar or rail crown) SHALL navigate to Home. | **Shipped** |
| FR-NAV-07 | Each screen SHALL show the tab label as the page heading. | **Shipped** |
| FR-NAV-08 | Until a tab ships its own screen, the app SHALL still boot and render a fallback that lists that tab’s data. | **Shipped** |
| FR-NAV-09 | The reading column SHALL remain centered and full-width of the body at phone, tablet, and desktop sizes (no phone-width content strip on tablet). | **Shipped** |
| FR-NAV-10 | Compact layouts SHALL respect iOS safe-area insets (top, bottom, home indicator). | **Shipped** |

### 3.2 Local-first data

| ID | Requirement | Status |
|---|---|---|
| FR-DATA-01 | All journal data SHALL persist in the browser (IndexedDB) so the app works with no network after first load of seed assets. | **Shipped** |
| FR-DATA-02 | Tabs SHALL read and write only through the shared `db` API. Direct storage access from a tab is out of contract. | **Shipped** |
| FR-DATA-03 | The data layer SHALL support upsert of bags, brews, ratings, ideas, recipes, brewers, grinders, and people, plus appearance get/set. | **Shipped** |
| FR-DATA-04 | `listBags()` SHALL exclude finished bags by default, and include them when `includeFinished: true` is passed (needed to name old brews). | **Shipped** |
| FR-DATA-05 | `listBrews()` SHALL return brews newest-date-first. | **Shipped** |
| FR-DATA-06 | `saveRecipeAsIdea` SHALL copy a global recipe into a new brew idea with a new id (row-copy of the canonical Recipe fields; no field mapping). | **Shipped** |
| FR-DATA-07 | Entity identifiers SHALL be stable strings (UUIDs for user-created rows; deterministic ids for seeded rows). | **Shipped** |
| FR-DATA-08 | Adding a later cloud backend (Supabase) SHALL NOT change `db` method signatures or require tab rewrites. | **Planned** |
| FR-DATA-09 | Cloud tables, when added, SHALL mirror the local entities; `ratings` SHALL FK to `brew_id` + `person_id`; access SHALL be private to the signed-in user (`user_id = auth.uid()`). | **Planned** |

### 3.3 First-run import and seeding

| ID | Requirement | Status |
|---|---|---|
| FR-SEED-01 | On a fresh (empty) store, the app SHALL import `public/seed-data.json` into bags, brews, ratings, ideas, recipes, brewers, grinders, and people. | **Shipped** |
| FR-SEED-02 | Import SHALL be idempotent: it SHALL run only when bags, brews, **and** ideas are all empty. A populated journal SHALL NOT be overwritten on reload. | **Shipped** |
| FR-SEED-03 | If seed fetch fails, the app SHALL still boot (empty journal). | **Shipped** |
| FR-SEED-04 | Offline conversion of the owner’s existing Excel/CSV journal (`Coffee Bags.xlsx`, `Brew Ideas.xlsx`, `My Coffee Brews.csv` plus `seed/*.json`) SHALL emit `seed-data.json` with deterministic ids. | **Shipped** (script) |
| FR-SEED-05 | Seed conversion SHALL treat bold coffee names as active bags and others as finished; column-C font colour as bag legend colour; Frozen Serves / Freeze Date as frozen state. | **Shipped** (script) |
| FR-SEED-06 | Seed conversion SHALL skip rating cells marked `NEEDS_CONFIRMATION`. | **Shipped** (script) |
| FR-SEED-07 | The user SHALL be able to re-import by clearing the `cassiopeia` IndexedDB and reloading. | **Shipped** (manual) |
| FR-SEED-08 | Settings SHALL later expose an explicit import action (not only “wipe IndexedDB”). | **Planned** |

### 3.4 Appearance and theming

| ID | Requirement | Status |
|---|---|---|
| FR-THEME-01 | The user SHALL be able to switch **Dark** and **Light** mode. The choice SHALL persist. | **Fallback** (Settings fallback) |
| FR-THEME-02 | Default mode SHALL be Light. | **Shipped** |
| FR-THEME-03 | The user SHALL be able to choose **Uniform** hue (one primary across tabs) or **Per-tab** hue (each tab seeds its own primary). Secondary, tertiary, and neutrals SHALL stay on brand keys. | **Fallback** |
| FR-THEME-04 | Default hue SHALL be uniform mauve (`#A15D66`). | **Shipped** |
| FR-THEME-05 | Changing appearance SHALL re-theme the shell immediately without a reload. | **Shipped** |
| FR-THEME-06 | Light mode SHALL pin page / surface to white (or near-white container steps), not a cream page fill. | **Shipped** |
| FR-THEME-07 | The browser theme-color meta SHALL follow the current surface colour. | **Shipped** |
| FR-THEME-08 | UI colours SHALL come from theme tokens, not hardcoded hex in tab UI (bag legend colours and person radar colours are data, not chrome). | **Shipped** |

### 3.5 Shared visualization: taste radar

| ID | Requirement | Status |
|---|---|---|
| FR-RADAR-01 | The app SHALL render a 9-axis SVG radar for cup scores (Flavour, Fragrance, Sweetness, Balance, Aftertaste, Mouthfeel, Body, Acidity, Bitterness). | **Shipped** |
| FR-RADAR-02 | Each axis label SHALL include its direction hint (e.g. “5 = highest”, “5 = lowest acidity”, “5 = lightest”). | **Shipped** |
| FR-RADAR-03 | Scores SHALL be plotted as stored. The radar SHALL NOT invert reversed axes. A “good” cup is not required to look like a large regular polygon. | **Shipped** |
| FR-RADAR-04 | One polygon (or line/dot) SHALL be drawn per person, in that person’s colour, superimposed on the same chart. | **Shipped** |
| FR-RADAR-05 | Unrated axes (`undefined`) SHALL be skipped, not plotted at centre. ≥3 rated axes → filled polygon; 2 → line; 1 → dot. | **Shipped** |
| FR-RADAR-06 | Grid rings SHALL show levels 1 through 5. | **Shipped** |

### 3.6 Shared catalog

| ID | Requirement | Status |
|---|---|---|
| FR-CAT-01 | A single Catalog component SHALL power Recipes facets: Coffee Pros, Brewers, Styles, Roasters. Adding a facet or entry is data, not new UI. | **Fallback** |
| FR-CAT-02 | Tapping a facet chip SHALL swap the visible item list. | **Fallback** |
| FR-CAT-03 | Tapping a row SHALL drill into that item. | **Fallback** (handler stub) |
| FR-CAT-04 | An optional row-level “+” SHALL quick-save that item’s recipe(s) to brew ideas. | **Fallback** (on recipe rows) |
| FR-CAT-05 | An empty facet SHALL show an empty state (“Nothing here yet.”). | **Shipped** (component) |

### 3.7 Images

| ID | Requirement | Status |
|---|---|---|
| FR-IMG-01 | User-uploaded bag photos SHALL be resized to ~1000px on the long edge and stored as WebP (JPEG fallback) data URLs. | **Shipped** |
| FR-IMG-02 | Seed photos referenced by filename SHALL resolve to `/photos/<name>`. Missing files SHALL degrade to a text/initials card, not a broken image. | **Shipped** |
| FR-IMG-03 | Thumbnails SHALL lazy-load; full-size SHALL show on the bag detail hero. | **Shipped** |
| FR-IMG-04 | Images are the only heavy payload; the product is sized for small data (~1–2 brews/day). | **Shipped** (constraint) |

---

## 4. Domain rules (apply everywhere scores or recipes appear)

### 4.1 Rating axes and direction

Nine cup axes, each 1–5 in **0.5 steps**. **5 is not always “best.”**

| Axis | Direction of 5 |
|---|---|
| Flavour, Fragrance, Sweetness, Balance, Aftertaste, Mouthfeel | highest / best |
| Acidity | **lowest** acidity |
| Bitterness | **lowest** bitterness |
| Body | **lightest** body |

| ID | Requirement | Status |
|---|---|---|
| FR-RATE-01 | Every slider and radar axis SHALL be labeled with its direction. | **Shipped** |
| FR-RATE-02 | Scores SHALL be stored as entered. No inversion on save, parse, or plot. | **Shipped** |
| FR-RATE-03 | Axes the user never touches SHALL remain unrated (`undefined` / displayed as “—”), not forced to a default number. | **Shipped** |
| FR-RATE-04 | A missing score means “not tasted for,” never “centre of the scale.” | **Shipped** |

### 4.2 Two kinds of notes (do not conflate)

| Record | Fields | When captured |
|---|---|---|
| Recipe / method | `Brew.notes`, `Brew.learnings` | While brewing (logger “Recipe” section) |
| Cup / tasting | `Rating.tastingNotes`, `Rating.learnings` | While tasting (logger “Cup” / rating step) |

| ID | Requirement | Status |
|---|---|---|
| FR-NOTE-01 | Brew notes/learnings SHALL describe the recipe and method. | **Shipped** |
| FR-NOTE-02 | Rating tasting notes and cup learnings SHALL describe what the tasting taught. | **Shipped** |
| FR-NOTE-03 | Insights and friend radars SHALL ignore `Rating.learnings` (optional, additive). | **Planned** (Insights) |

### 4.3 Canonical recipe shape

`BrewIdea` and `GlobalRecipe` share: brewer, dose, ratio, grind, temp, steps, target time, source, source confidence, author, best-for.

| ID | Requirement | Status |
|---|---|---|
| FR-REC-01 | Saving a global recipe as an idea, then promoting that idea onto a brew, SHALL be field-compatible without transformation. | **Shipped** (save); **Fallback/Planned** (Ideas UI, brew link is in Brews form) |

### 4.4 Relational model

```
Bag ─────< Brew >───── Brewer
 │           │  └────── Grinder
 │           │  └────── BrewIdea (optional recipeId)
 │           └────< Rating >──── Person (self or friend)
BrewIdea ──(promote)──> Brew
GlobalRecipe ──(saveRecipeAsIdea)──> BrewIdea
```

| ID | Requirement | Status |
|---|---|---|
| FR-REL-01 | A brew SHALL reference a bag, optionally a brewer, grinder, and brew idea, by id. | **Shipped** |
| FR-REL-02 | Ratings SHALL reference a brew and a person by id. | **Shipped** |
| FR-REL-03 | Cross-tab reverse links (e.g. “brews that used this idea”) SHALL be derived by filtering existing lists when opened, not by pre-fetching or new db methods. | **Planned** (Ideas) |

---

## 5. Home

Dedicated Home tab is not shipped; Foundation fallback is live.

| ID | Requirement | Status |
|---|---|---|
| FR-HOME-01 | Home SHALL summarize the journal: counts of bags, brews, ideas, recipes, brewers, and people, each tappable to that tab. | **Fallback** |
| FR-HOME-02 | Home SHALL offer primary actions to log a brew and to pick a brew idea. | **Fallback** |
| FR-HOME-03 | Home SHALL surface bags in their peak window (resting / peak / past peak derived from roast date). | **Planned** |
| FR-HOME-04 | Home SHALL feature the latest cup plus a short strip of recent earlier brews. | **Planned** |
| FR-HOME-05 | Featured brew tiles SHALL skip unrated / zero-score axes rather than plotting them as zero. | **Planned** |

---

## 6. Brews (daily logger)

This is the core loop. Fully shipped except friends-at-the-table.

### 6.1 Brew log list

| ID | Requirement | Status |
|---|---|---|
| FR-BREW-01 | Brews SHALL list in reverse chronological order. | **Shipped** |
| FR-BREW-02 | Each row SHALL show date, coffee name (in the bag’s legend colour when set), optional brewer chip, and optional dose chip. | **Shipped** |
| FR-BREW-03 | Tapping a row SHALL open that brew’s detail. | **Shipped** |
| FR-BREW-04 | An empty journal SHALL show a prompt to upload a daily log or fill the form. | **Shipped** |
| FR-BREW-05 | The list SHALL offer two create paths: **Upload or paste** (default) and **Fill the form**. | **Shipped** |

### 6.2 Brew detail

| ID | Requirement | Status |
|---|---|---|
| FR-BREW-06 | Detail SHALL show coffee name, roaster, date, brewer, grinder, and linked idea (when present). | **Shipped** |
| FR-BREW-07 | Recipe/method details SHALL live in a collapsed **Recipe** accordion (dose, water, ratio, temp, time, grind, filter, roast date, followed idea, pour technique, brew notes, ponderings). Content SHALL mount only when opened. | **Shipped** |
| FR-BREW-08 | The collapsed accordion SHALL tease the idea name, or else dose · ratio · temp. | **Shipped** |
| FR-BREW-09 | Detail SHALL show a Taste radar of all ratings on that brew, plus the owner’s tasting-note chips and cup learnings. | **Shipped** |
| FR-BREW-10 | The user SHALL be able to edit the brew and to add or edit their rating from detail. | **Shipped** |
| FR-BREW-11 | Missing brew SHALL show a not-found state with a back path to the list. | **Shipped** |
| FR-BREW-12 | Unrated brews SHALL show “No ratings for this brew yet.” | **Shipped** |

### 6.3 New / edit brew form

| ID | Requirement | Status |
|---|---|---|
| FR-BREW-13 | The only required field SHALL be **coffee** (bag). All other logger fields are optional. | **Shipped** |
| FR-BREW-14 | Coffee dropdown SHALL list **active** bags only (`listBags()` default). When editing a brew of a finished bag, that bag SHALL remain selectable and labeled “(finished)”. | **Shipped** |
| FR-BREW-15 | Picking a bag SHALL auto-fill roast date from the bag (user may override). | **Shipped** |
| FR-BREW-16 | Date SHALL default to today (local calendar date). | **Shipped** |
| FR-BREW-17 | If exactly one grinder exists, it MAY be preselected. | **Shipped** |
| FR-BREW-18 | Optional brew-idea picker SHALL link `recipeId` and prefill dose, water (from ratio), temp, grind, pour technique, and brewer when the idea specifies them. | **Shipped** |
| FR-BREW-19 | The form SHALL capture setup (brewer, grinder, grind, filter) and brew params (dose g, water g, temp °C, total time) plus a live dose:water ratio chip. | **Shipped** |
| FR-BREW-20 | The form SHALL capture pour technique, brew notes, and ponderings/learnings (recipe record). | **Shipped** |
| FR-BREW-21 | Saving a **new** brew SHALL then open the rating step. Saving an **edit** SHALL return to that brew’s detail. | **Shipped** |
| FR-BREW-22 | From a new-brew form the user SHALL be able to switch to upload/paste instead. | **Shipped** |
| FR-BREW-23 | Friend flags (`withFriends`, `friendIds`) SHALL be preserved on edit but not captured in this form until the friends phase. | **Planned** (capture) |

### 6.4 Upload / paste daily log

| ID | Requirement | Status |
|---|---|---|
| FR-BREW-24 | The user SHALL be able to upload one or more `.md` / `.txt` files (including drag-and-drop) or paste notes, then parse them into journal drafts. | **Shipped** |
| FR-BREW-25 | Several days / files at once SHALL be allowed. Files over 400 KB SHALL be rejected with an error. | **Shipped** |
| FR-BREW-26 | Parsing SHALL be heuristic (labeled fields), not a per-log AI call. The full original note SHALL be stored on `Brew.notes` so prose is not lost. | **Shipped** |
| FR-BREW-27 | The parser SHALL extract date (from labeled field, body, or filename; else default today), coffee, dose, water, temp, brewer, grinder, filter, grind, pour schedule, total time, tasting scores, tasting-note chips, brew notes, ponderings, and cup learnings. | **Shipped** |
| FR-BREW-28 | Coffee SHALL be matched to bags by name/roaster (fuzzy). High-confidence unique matches auto-select; otherwise the user MUST pick a bag before save. Finished bags may appear as candidates. | **Shipped** |
| FR-BREW-29 | Brewer and grinder SHALL be matched against Settings catalogs. Unmatched names SHALL warn and leave the field unset (grinder name may be recorded on the grind line). | **Shipped** |
| FR-BREW-30 | Parsed acidity/bitterness/body scores SHALL be stored on the journal scale as-is (5 = lowest acidity / lowest bitterness / lightest body). | **Shipped** |
| FR-BREW-31 | Before save, the user SHALL preview extracted fields, correct coffee and date, and see warnings. | **Shipped** |
| FR-BREW-32 | Save SHALL create a brew per draft. If the log contained cup scores, tasting notes, or cup learnings, a self Rating SHALL be created too. | **Shipped** |
| FR-BREW-33 | After saving one unrated brew, the app SHALL open the rating step. After a rated brew, detail. After multiple brews, the list. | **Shipped** |
| FR-BREW-34 | Unparseable input SHALL tell the user to check the log or use the form instead. The user SHALL be able to switch to the form or choose a different log. | **Shipped** |

### 6.5 Ratings

| ID | Requirement | Status |
|---|---|---|
| FR-BREW-35 | Rating SHALL present the nine axes in `RATING_AXES` order, each with a 1–5 slider, 0.5 step, direction label, numeric value or “—”, and a clear control. | **Shipped** |
| FR-BREW-36 | Tasting notes SHALL be free-text chips (comma or Enter to add; tap to remove). | **Shipped** |
| FR-BREW-37 | Cup learnings SHALL be a free-text field distinct from brew learnings. | **Shipped** |
| FR-BREW-38 | A live radar SHALL update as sliders move. | **Shipped** |
| FR-BREW-39 | The rating SHALL save as the self Person’s `Rating` for that brew. Editing SHALL update the existing row. | **Shipped** |
| FR-BREW-40 | If no people exist, rating SHALL refuse and direct the user to add themselves in Settings. | **Shipped** |
| FR-BREW-41 | A brew + rating SHALL survive reload (IndexedDB). | **Shipped** |

---

## 7. Bags

Fully shipped, including photo upload.

### 7.1 Bag list

| ID | Requirement | Status |
|---|---|---|
| FR-BAG-01 | Bags SHALL list as cards/rows showing name, roaster, colour legend dot, roast date, frozen/finished badges, and peak-window chip when applicable. | **Shipped** |
| FR-BAG-02 | Finished bags SHALL be visually muted. | **Shipped** |
| FR-BAG-03 | Default sort SHALL be open (active) first, then frozen, then finished; within a group, newest roast date, then `sr`. | **Shipped** |
| FR-BAG-04 | The user SHALL filter by Open, Frozen, Finished, or All. Open = not finished (frozen open bags included in Frozen, not Open). | **Shipped** |
| FR-BAG-05 | Empty list and empty-filter states SHALL be distinct. | **Shipped** |
| FR-BAG-06 | A primary **Add bag** action SHALL open the new-bag form. | **Shipped** |
| FR-BAG-07 | Tapping a row SHALL open bag detail. | **Shipped** |
| FR-BAG-08 | Thumbnails SHALL show the photo or a letter fallback. | **Shipped** |

### 7.2 Bag detail

| ID | Requirement | Status |
|---|---|---|
| FR-BAG-09 | Detail SHALL show hero name/roaster/photo/colour, origin block, cup/roast block, and roaster location block — omitting empty sections. | **Shipped** |
| FR-BAG-10 | The user SHALL toggle **finished** and **frozen** in place. Marking frozen SHALL default freeze date to today if unset. Unfreezing SHALL clear the frozen flag (amount/date retained until next freeze as implemented). | **Shipped** |
| FR-BAG-11 | When frozen, the user SHALL edit frozen amount and freeze date from detail. | **Shipped** |
| FR-BAG-12 | Finished bags SHALL be described as hidden from the Brews coffee dropdown. | **Shipped** |
| FR-BAG-13 | Peak window SHALL display on non-finished bags (see FR-BAG-20). | **Shipped** |
| FR-BAG-14 | **Edit bag** SHALL open the full form. Missing bag SHALL show not-found + back. | **Shipped** |

### 7.3 Add / edit bag

| ID | Requirement | Status |
|---|---|---|
| FR-BAG-15 | Coffee name and roaster SHALL be required; all other fields optional. | **Shipped** |
| FR-BAG-16 | The form SHALL capture origin, country, altitude, varietal, process, type, season, roast date/level, SCA score, selection, tasting notes, roaster location/country, legend colour, photo, finished/frozen + frozen amount/date. | **Shipped** |
| FR-BAG-17 | The user SHALL pick a legend colour via colour well and hex text. | **Shipped** |
| FR-BAG-18 | The user SHALL add, replace, or remove a photo (see FR-IMG-01). | **Shipped** |
| FR-BAG-19 | Save SHALL upsert the bag and open its detail. New bags SHALL receive the next `sr`. | **Shipped** |

### 7.4 Peak window

Filter-coffee rest/peak derived from `roastDate` (local dates):

| Days since roast | Phase | Label |
|---|---|---|
| < 0 | resting | Roasts in the future |
| 0–6 | resting | Resting · day *n* |
| 7–21 | peak | Peak · day *n* |
| ≥ 22 | past | Past peak · day *n* |

| ID | Requirement | Status |
|---|---|---|
| FR-BAG-20 | Peak phase SHALL be computed as above. Missing roast date SHALL hide the chip. Finished and frozen bags SHALL NOT show a peak chip on the list (detail may still compute it for non-finished). | **Shipped** |

---

## 8. Ideas

Dedicated Ideas tab not shipped; fallback lists seeded ideas.

| ID | Requirement | Status |
|---|---|---|
| FR-IDEA-01 | Ideas SHALL list personal brew ideas (name, brewer, tried flag, colour). | **Fallback** |
| FR-IDEA-02 | Expanding / opening an idea SHALL show the canonical recipe fields plus result. | **Fallback** |
| FR-IDEA-03 | The user SHALL create, edit, and mark ideas tried, and record a result after brewing. | **Planned** |
| FR-IDEA-04 | Under an idea, an accordion **Brews that used this** SHALL list brews whose `recipeId` matches, loaded only when opened. | **Planned** |
| FR-IDEA-05 | Ideas created via Recipes “Save to brew ideas” SHALL appear here. | **Fallback** (save path exists) |
| FR-IDEA-06 | The user SHALL be able to promote an idea onto a new brew (Brews form already links `recipeId`). | **Partial** (from Brews; not from Ideas) |

---

## 9. Recipes

Dedicated Recipes tab not shipped; fallback uses Catalog + expandable recipe list.

| ID | Requirement | Status |
|---|---|---|
| FR-RPL-01 | Recipes SHALL browse a global catalog filterable by Coffee Pros, Brewers, Styles, and Roasters. | **Fallback** |
| FR-RPL-02 | Tapping a pro (or other facet item) SHALL drill into that item’s recipes. | **Planned** |
| FR-RPL-03 | Recipe detail SHALL show why, brewer, dose, ratio, grind, temp, steps, target time, source, best-for, author, and confidence. | **Fallback** |
| FR-RPL-04 | From a recipe row or detail, **Save to brew ideas** SHALL copy the recipe into Ideas (`db.saveRecipeAsIdea`) and confirm success. | **Fallback** |
| FR-RPL-05 | Adding catalog entries SHALL be a data change (seed / Settings), not new screens per pro. | **Shipped** (contract) |

---

## 10. Insights and Wrapped

Dedicated Insights tab not shipped; fallback shows the latest brew’s radar.

| ID | Requirement | Status |
|---|---|---|
| FR-INS-01 | Insights SHALL show a radar for recent / latest rated brews (self, and friends when present). | **Fallback** (latest only) |
| FR-INS-02 | Insights SHALL show trends over time (scores, dose, etc. — small-data, no heavy chart library required beyond radar). | **Planned** |
| FR-INS-03 | Insights MAY include a cached AI summary of notes. AI SHALL be analysis-only, never invoked per brew log. | **Planned** |
| FR-INS-04 | Empty state: no rated brews yet. | **Fallback** |

### 10.1 Coffee Wrapped (year-in-review)

Owned by the Insights tab as a subview.

| ID | Requirement | Status |
|---|---|---|
| FR-WRAP-01 | Wrapped SHALL present a detailed year-in-review covering: roasters, region, bags, grams brewed, origins, varieties, processes, notes, decaf %, days since first bag, recipes used, a month timeline, and photos. | **Planned** |
| FR-WRAP-02 | Wrapped SHALL be navigable from Insights (not a separate primary tab). | **Planned** |

---

## 11. Settings

Dedicated Settings editor not shipped; fallback covers appearance toggle plus read-only gear/people lists.

| ID | Requirement | Status |
|---|---|---|
| FR-SET-01 | The user SHALL toggle Dark / Light and Uniform / Per-tab hue (see FR-THEME-*). | **Fallback** |
| FR-SET-02 | The user SHALL list and add/edit **brewers**. | **Fallback** (list only) |
| FR-SET-03 | The user SHALL list and add/edit **grinders**. | **Fallback** (list only) |
| FR-SET-04 | The user SHALL list and add/edit **people**, each with a name and colour; one person SHALL be marked self. Person colours SHALL seed superimposed radars. | **Fallback** (list only) |
| FR-SET-05 | Settings SHALL expose sync status/controls once cloud is wired. | **Planned** |
| FR-SET-06 | Settings SHALL expose import (re-seed / bring-your-own journal) without requiring DevTools. | **Planned** |
| FR-SET-07 | Settings SHALL expose iCloud mirror export controls once Phase 6 lands. | **Planned** |
| FR-SET-08 | Settings SHALL expose AI (enable/disable or cache) for Insights summaries only. | **Planned** |

---

## 12. Friends, PWA, sync, and mirror (Phase 6)

Cross-cutting; last, sequential, not a tab-agent task.

### 12.1 Friends

| ID | Requirement | Status |
|---|---|---|
| FR-FRN-01 | A brew MAY be flagged as with friends and record `friendIds`. | **Partial** (fields exist; no UI) |
| FR-FRN-02 | Each friend present SHALL be able to have their own `Rating` on that brew. | **Shipped** (data + radar); **Planned** (capture UI) |
| FR-FRN-03 | Friend ratings SHALL overlay the owner’s radar in that friend’s colour. | **Shipped** (radar) |

### 12.2 PWA

| ID | Requirement | Status |
|---|---|---|
| FR-PWA-01 | The app SHALL be installable on iPhone and Mac (manifest, icons, standalone display). Icons are prepared; wiring is Phase 6. | **Planned** |
| FR-PWA-02 | After install / first cache, core journaling SHALL work offline against IndexedDB. | **Planned** (local-first already; service worker not wired) |

### 12.3 Cloud sync (Supabase)

| ID | Requirement | Status |
|---|---|---|
| FR-SYNC-01 | The owner SHALL be able to sign in and sync the private journal across devices. | **Planned** |
| FR-SYNC-02 | Sync SHALL layer behind `db.ts` (delta / snapshot) so tabs do not change. | **Planned** |
| FR-SYNC-03 | Storage for photos MAY move to cloud storage; local resize rules still apply before upload. | **Planned** |

### 12.4 iCloud mirror

| ID | Requirement | Status |
|---|---|---|
| FR-MIR-01 | On a schedule (not every write), a script SHALL export the journal to `iCloud Drive/Cassiopeia/` as `cassiopeia.xlsx` (human-readable) and `cassiopeia.sqlite` (full fidelity). | **Planned** (stub exists) |
| FR-MIR-02 | The owner SHALL retain an ownable copy independent of the web app. | **Planned** |

---

## 13. Fallback / Foundation browse (until each tab ships)

These keep the app useful and reviewable before tab agents land. They are temporary functional requirements of the running product.

| ID | Requirement | Status |
|---|---|---|
| FR-FB-01 | Fallback lists SHALL be expandable to full field detail. | **Shipped** |
| FR-FB-02 | Fallback Brews SHALL include the per-brew radar. | **Shipped** |
| FR-FB-03 | Fallback Recipes SHALL exercise Catalog facets and “+” save-to-ideas. | **Shipped** |
| FR-FB-04 | Fallback Settings SHALL exercise appearance toggles and show gear/people. | **Shipped** |
| FR-FB-05 | Fallback Home SHALL prove imported counts and primary CTAs. | **Shipped** |

Once a tab default-exports its screen, that fallback SHALL no longer render for that tab (Bags and Brews already replaced theirs).

---

## 14. Non-goals (explicitly out of scope)

These are **not** functional requirements of this project:

- Multi-user public social network, comments, or follows.
- Marketplace, inventory purchasing, or shop integrations.
- Per-log generative AI (logging must stay heuristic / form-based).
- Heavy chart or CSS frameworks; custom radar only.
- Backend-required core journaling.
- Espresso-machine telemetry or Bluetooth scale integrations.
- Perfect extraction science (winging-it is first-class: only coffee is required to save a brew).

---

## 15. Implementation snapshot

| Area | Status |
|---|---|
| Foundation (shell, router, db, theme, import, radar, catalog) | Done |
| Brews (list, detail, form, log parse, ratings, edit) | Done |
| Bags (list, detail, add/edit, state toggles, peak, photos) | Done |
| Home | Fallback; peak dashboard planned |
| Ideas | Fallback; CRUD + reverse brew list planned |
| Recipes | Fallback; drill-in detail planned |
| Insights + Wrapped | Fallback; trends, AI summary, Wrapped planned |
| Settings | Fallback; full editors, sync, import, mirror, AI planned |
| Friends capture UI | Planned |
| PWA / Supabase / iCloud mirror | Planned |

---

## 16. Traceability

| Source | What it owns |
|---|---|
| This file (`REQUIREMENTS.md`) | User-facing functional requirements (what / who / status) |
| [`CONTRACTS.md`](./CONTRACTS.md) | Types, `db` API, tokens, shared component props, file ownership |
| [`src/lib/types.ts`](./src/lib/types.ts) | Canonical entity shapes and rating axes |
| [`HANDOFF.md`](./HANDOFF.md) | Build order, feature checklists, open questions |
| [`README.md`](./README.md) | Product pitch, stack, how to run |

When a contract change adds or removes user-visible behaviour, update this file in the same change.
