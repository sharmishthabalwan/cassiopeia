// Cassiopeia — Foundation fallback screens (Foundation-owned, temporary).
// Rendered for any tab whose tabs/<id>/index.tsx has no default export yet.
// Purpose: prove the Foundation acceptance checks — imported bags/brews/ideas
// browsable (rows expand to full detail, brews include the radar), Radar +
// Catalog exercised, theme toggles working, primary CTAs navigating.
// Each tab agent replaces its screen by default-exporting a component.

import type { JSX, ComponentChildren } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { db } from "./lib/db";
import { go } from "./router";
import { Radar } from "./lib/radar";
import { Catalog } from "./lib/catalog";
import type { Bag, Brew, BrewIdea, GlobalRecipe, Brewer, Grinder, Person, Rating, Appearance } from "./lib/types";

interface Data {
  bags: Bag[]; brews: Brew[]; ideas: BrewIdea[]; recipes: GlobalRecipe[];
  brewers: Brewer[]; grinders: Grinder[]; people: Person[];
}

function useData(): Data | null {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    (async () => {
      const [bags, brews, ideas, recipes, brewers, grinders, people] = await Promise.all([
        db.listBags({ includeFinished: true }), db.listBrews(), db.listIdeas(),
        db.listRecipes(), db.listBrewers(), db.listGrinders(), db.listPeople(),
      ]);
      setData({ bags, brews, ideas, recipes, brewers, grinders, people });
    })();
  }, []);
  return data;
}

const Loading = () => <div class="sub">Loading…</div>;

/** Key/value detail block shown inside an expanded row. */
function Detail({ rows }: { rows: [string, string | number | undefined][] }) {
  return (
    <div class="raw-detail">
      {rows.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => (
        <div class="raw-kv"><span class="k">{k}</span><span>{v}</span></div>
      ))}
    </div>
  );
}

/** A raw-list row that expands on tap to reveal children. */
function ExpandRow({ summary, children }: { summary: ComponentChildren; children: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  return (
    <div class={`raw-expand${open ? " open" : ""}`}>
      <button class="raw-item raw-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        {summary}
        <span class="chev">{open ? "▾" : "▸"}</span>
      </button>
      {open && children}
    </div>
  );
}

// ---- home -------------------------------------------------------------------

function HomeFallback() {
  const d = useData();
  if (!d) return <Loading />;
  const counts: [string, number, string][] = [
    ["Bags", d.bags.length, "bags"], ["Brews", d.brews.length, "brews"],
    ["Ideas", d.ideas.length, "ideas"], ["Recipes", d.recipes.length, "recipes"],
    ["Brewers", d.brewers.length, "settings"], ["People", d.people.length, "settings"],
  ];
  return (
    <div>
      <div class="glass hero">
        <div style="font:600 18px var(--font-sans)">Foundation is up ☕</div>
        <div style="font:400 13px var(--font-sans);opacity:.85;margin:4px 0 12px">
          Data imported and readable through db.ts. Tab agents land next.
        </div>
        <div class="seg" style="margin:0">
          <button class="btn" style="background:rgba(255,255,255,.16);box-shadow:none" onClick={() => go("brews")}>☕ Log a brew</button>
          <button class="btn" style="background:rgba(255,255,255,.16);box-shadow:none" onClick={() => go("ideas")}>✦ Pick a brew idea</button>
        </div>
      </div>
      <div class="glass">
        {counts.map(([label, n, tab]) => (
          <button class="raw-item raw-toggle" onClick={() => go(tab)}>
            <span>{label}</span><span class="flag">{n}</span><span class="chev">›</span>
          </button>
        ))}
      </div>
      <div class="sub">The full logger lands with the Brews agent (Phase 2b); Home's real screen with peak-window flags is Phase 3.</div>
    </div>
  );
}

// ---- bags -------------------------------------------------------------------

function BagsFallback() {
  const d = useData();
  if (!d) return <Loading />;
  return (
    <div class="glass">
      {d.bags.map((b) => (
        <ExpandRow
          summary={
            <>
              <span class="k">{b.roaster}</span>
              <span style={b.color ? `color:${b.color}` : undefined}>{b.coffeeName}</span>
              {b.finished && <span class="flag">finished</span>}
              {b.frozen && <span class="flag">frozen{b.frozenAmount ? ` · ${b.frozenAmount}` : ""}</span>}
            </>
          }
        >
          <Detail rows={[
            ["Roast date", b.roastDate], ["Processing", b.processing], ["Varietal", b.varietal],
            ["Notes", b.notes], ["Origin", b.origin], ["Country", b.originCountry],
            ["Altitude", b.altitude], ["Type", b.type], ["SCA score", b.scaCupScore],
            ["Roast", b.roast], ["Roaster location", b.roasterLocation], ["Roaster country", b.roasterCountry],
            ["Freeze date", b.freezeDate], ["Photo", b.photo],
          ]} />
        </ExpandRow>
      ))}
    </div>
  );
}

// ---- brews ------------------------------------------------------------------

function BrewRadar({ brew, people }: { brew: Brew; people: Person[] }) {
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  useEffect(() => { db.ratingsForBrew(brew.id).then(setRatings); }, [brew.id]);
  if (!ratings) return <Loading />;
  if (!ratings.length) return <div class="sub">No ratings for this brew.</div>;
  const series = ratings.map((r) => {
    const p = people.find((p) => p.id === r.personId);
    return { name: p?.name ?? "You", color: p?.color ?? "#A85A72", scores: r.scores };
  });
  return <div style="display:flex;justify-content:center"><Radar series={series} size={190} /></div>;
}

function BrewsFallback() {
  const d = useData();
  if (!d) return <Loading />;
  const bagName = (id: string) => d.bags.find((b) => b.id === id)?.coffeeName ?? "?";
  const brewerName = (id: string) => d.brewers.find((b) => b.id === id)?.name ?? "?";
  return (
    <div class="glass">
      {d.brews.map((b) => (
        <ExpandRow
          summary={
            <>
              <span class="k">{b.date}</span>
              <span>{bagName(b.bagId)}</span>
              <span class="flag">{brewerName(b.brewerId)}{b.doseG ? ` · ${b.doseG}g` : ""}</span>
            </>
          }
        >
          <Detail rows={[
            ["Filter", b.filter], ["Roast date", b.roastDate],
            ["Dose", b.doseG && `${b.doseG}g`], ["Water", b.waterG && `${b.waterG}g`],
            ["Temp", b.tempC && `${b.tempC}°C`], ["Total time", b.totalTime],
            ["Grind", b.grind], ["Pour technique", b.pourTechnique],
            ["Notes", b.notes], ["Learnings", b.learnings],
          ]} />
          <BrewRadar brew={b} people={d.people} />
        </ExpandRow>
      ))}
    </div>
  );
}

// ---- ideas ------------------------------------------------------------------

function IdeasFallback() {
  const d = useData();
  if (!d) return <Loading />;
  return (
    <div class="glass">
      {d.ideas.map((i) => (
        <ExpandRow
          summary={
            <>
              <span style={i.color ? `color:${i.color}` : undefined}>{i.name}</span>
              {i.brewer && <span class="k">{i.brewer}</span>}
              {i.tried && <span class="flag">tried</span>}
            </>
          }
        >
          <Detail rows={[
            ["Best for", i.bestFor], ["Dose", i.dose], ["Ratio", i.ratio],
            ["Grind", i.grind], ["Temp", i.temp], ["Steps", i.steps],
            ["Target time", i.targetTime], ["Source", i.source],
            ["Confidence", i.sourceConfidence], ["Result", i.result],
          ]} />
        </ExpandRow>
      ))}
    </div>
  );
}

// ---- recipes ----------------------------------------------------------------

function RecipesFallback() {
  const d = useData();
  const [facet, setFacet] = useState("pros");
  const [saved, setSaved] = useState<string | null>(null);
  const pros = useMemo(() => {
    if (!d) return [];
    const seen = new Map<string, number>();
    for (const r of d.recipes) if (r.proId) seen.set(r.proId, (seen.get(r.proId) ?? 0) + 1);
    return [...seen.entries()];
  }, [d]);
  if (!d) return <Loading />;

  const distinct = (vals: (string | undefined)[]) => [...new Set(vals.filter(Boolean) as string[])];
  const items =
    facet === "pros"
      ? pros.map(([id, n]) => ({ id, title: id, subtitle: `${n} recipe${n === 1 ? "" : "s"}` }))
      : facet === "brewers"
        ? distinct(d.recipes.map((r) => r.brewer)).map((b) => ({ id: b, title: b }))
        : facet === "styles"
          ? distinct(d.recipes.map((r) => r.style)).map((s) => ({ id: s, title: s }))
          : distinct(d.bags.map((b) => b.roaster)).map((r) => ({ id: r, title: r }));

  return (
    <div>
      <Catalog
        facets={[
          { id: "pros", label: "Coffee Pros" }, { id: "brewers", label: "Brewers" },
          { id: "styles", label: "Styles" }, { id: "roasters", label: "Roasters" },
        ]}
        activeFacet={facet}
        items={items}
        onOpen={() => {}}
        onFacetChange={setFacet}
      />
      <div class="sub" style="margin:14px 0 8px">All recipes — expand for detail, “+” quick-saves to brew ideas</div>
      <div class="glass">
        {d.recipes.map((r) => (
          <ExpandRow
            summary={
              <>
                <span>{r.name}</span>
                <span class="k">{r.author}</span>
                <button
                  class="flag"
                  style="cursor:pointer;background:var(--field)"
                  aria-label={`Save ${r.name} to brew ideas`}
                  onClick={async (e) => { e.stopPropagation(); await db.saveRecipeAsIdea(r); setSaved(r.name); }}
                >
                  +
                </button>
              </>
            }
          >
            <Detail rows={[
              ["Why", r.why], ["Brewer", r.brewer], ["Dose", r.dose], ["Ratio", r.ratio],
              ["Grind", r.grind], ["Temp", r.temp], ["Steps", r.steps],
              ["Target time", r.targetTime], ["Source", r.source], ["Best for", r.bestFor],
            ]} />
          </ExpandRow>
        ))}
      </div>
      {saved && <div class="sub">Saved “{saved}” to brew ideas ✓ — see the Ideas tab</div>}
    </div>
  );
}

// ---- insights ---------------------------------------------------------------

function InsightsFallback() {
  const d = useData();
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  const latest = d?.brews[0];
  useEffect(() => {
    if (latest) db.ratingsForBrew(latest.id).then(setRatings);
  }, [latest?.id]);
  if (!d) return <Loading />;
  if (!latest || !ratings?.length) return <div class="sub">No rated brews yet.</div>;
  const series = ratings.map((r) => {
    const p = d.people.find((p) => p.id === r.personId);
    return { name: p?.name ?? "You", color: p?.color ?? "#A85A72", scores: r.scores };
  });
  const bag = d.bags.find((b) => b.id === latest.bagId);
  return (
    <div class="glass" style="display:flex;flex-direction:column;align-items:center">
      <div class="sub" style="align-self:flex-start">Latest brew — {latest.date} · {bag?.coffeeName}</div>
      <Radar series={series} size={200} />
    </div>
  );
}

// ---- settings ---------------------------------------------------------------

function SettingsFallback() {
  const d = useData();
  const [app, setApp] = useState<Appearance | null>(null);
  useEffect(() => { db.getAppearance().then(setApp); }, []);
  if (!d || !app) return <Loading />;
  const save = (next: Appearance) => { setApp(next); db.setAppearance(next); };
  return (
    <div>
      <div class="glass">
        <div class="sub">Mode</div>
        <div class="seg">
          <button class={`btn${app.mode === "dark" ? "" : " ghost"}`} onClick={() => save({ ...app, mode: "dark" })}>Dark</button>
          <button class={`btn${app.mode === "light" ? "" : " ghost"}`} onClick={() => save({ ...app, mode: "light" })}>Light</button>
        </div>
        <div class="sub" style="margin-top:12px">Hue</div>
        <div class="seg">
          <button class={`btn${app.hueMode === "perTab" ? "" : " ghost"}`} onClick={() => save({ ...app, hueMode: "perTab" })}>Per-tab</button>
          <button
            class={`btn${app.hueMode === "uniform" ? "" : " ghost"}`}
            onClick={() => save({ ...app, hueMode: "uniform", uniform: app.uniform ?? { a1: "#B0475F", a2: "#5A1E32" } })}
          >
            Uniform
          </button>
        </div>
      </div>
      <div class="glass">
        <div class="sub" style="margin-bottom:6px">Brewers</div>
        {d.brewers.map((b) => <div class="raw-item"><span>{b.name}</span></div>)}
        <div class="sub" style="margin:10px 0 6px">Grinders</div>
        {d.grinders.map((g) => <div class="raw-item"><span>{g.name}</span></div>)}
        <div class="sub" style="margin:10px 0 6px">People</div>
        {d.people.map((p) => (
          <div class="raw-item">
            <span style={`display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color}`} />
            <span>{p.name}{p.isSelf ? " (you)" : ""}</span>
          </div>
        ))}
      </div>
      <div class="sub">People colors seed the superimposed radars. Full editor lands with the Settings agent.</div>
    </div>
  );
}

const SCREENS: Record<string, () => JSX.Element> = {
  home: HomeFallback, bags: BagsFallback, brews: BrewsFallback, ideas: IdeasFallback,
  recipes: RecipesFallback, insights: InsightsFallback, settings: SettingsFallback,
};

export function Fallback({ tab }: { tab: string }) {
  const Screen = SCREENS[tab] ?? HomeFallback;
  return <Screen />;
}
