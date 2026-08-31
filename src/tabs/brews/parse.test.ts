// Self-running parser checks against the two sample daily-brew logs.
import { readFileSync } from "node:fs";
import { parseBrewLog, parseHasSignal } from "./parse.ts";
import type { Catalog } from "./parse.ts";

const log1 = readFileSync(new URL("./fixtures/30-aug-2026-sey-wilson-alba.md", import.meta.url), "utf8");
const log2 = readFileSync(new URL("./fixtures/31-aug-2026.md", import.meta.url), "utf8");

const catalog: Catalog = {
  bags: [
    { id: "bag-3", roaster: "Sey", coffeeName: "Marlene Rojas", finished: false, frozen: true },
    { id: "bag-4", roaster: "Sey", coffeeName: "Wilson Alba", finished: false, frozen: true },
    { id: "bag-5", roaster: "Prodigal", coffeeName: "Dreyde Perez", finished: false, frozen: false },
  ],
  brewers: [
    { id: "v60", name: "V60" },
    { id: "v60-switch", name: "V60 Switch" },
    { id: "hario-cold", name: "Cold Brew Hario" },
  ],
  grinders: [
    { id: "k-ultra", name: "1Zpresso K-Ultra" },
    { id: "df83v", name: "DF83V" },
  ],
};

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g !== w) {
    failed++;
    console.error(`FAIL ${name}\n  got  ${g}\n  want ${w}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

const a = parseBrewLog(log1, catalog, "30 Aug 2026 Brew- Sey Wilson Alba.md");
eq("log1 signal", parseHasSignal(a), true);
eq("log1 date", a.date, "2026-08-30");
eq("log1 dateSource", a.dateSource, "filename");
eq("log1 coffee", a.coffeeHint, "Wilson Alba");
eq("log1 roaster", a.roasterHint, "Sey");
eq("log1 bag", a.bagId, "bag-4");
eq("log1 bagConfidence", a.bagConfidence, "high");
eq("log1 dose", a.doseG, 17.9);
eq("log1 water", a.waterG, 285);
eq("log1 temp", a.tempC, 92);
eq("log1 brewer", a.brewerId, "v60");
eq("log1 filter", a.filter, "Hario white bleached paper");
eq("log1 grind contains 76.5", (a.grind ?? "").includes("76.5"), true);
eq("log1 grind contains 600", (a.grind ?? "").includes("600"), true);
eq("log1 time", a.totalTime, "7:28");
eq("log1 pour has bloom", /50\s*g/i.test(a.pourTechnique ?? ""), true);
eq("log1 acidity inverted 3.5 → 2.5", a.scores.acidity, 2.5);
eq("log1 sweetness ~2.75 → 3", a.scores.sweetness, 3);
eq("log1 bitterness", a.scores.bitterness, 4);
eq("log1 balance", a.scores.balance, 2);

const catalogNoDf = { ...catalog, grinders: catalog.grinders.filter((g) => g.id !== "df83v") };
const b = parseBrewLog(log2, catalogNoDf, "31 Aug 2026 Brew.md");
eq("log2 signal", parseHasSignal(b), true);
eq("log2 date", b.date, "2026-08-31");
eq("log2 dateSource", b.dateSource, "log");
eq("log2 unknown coffee no bag", b.bagId, undefined);
eq("log2 dose", b.doseG, 17.2);
eq("log2 water", b.waterG, 276);
eq("log2 temp", b.tempC, 93);
eq("log2 brewer implied V60", b.brewerId, "v60");
eq("log2 time", b.totalTime, "7:00");
eq("log2 acidity inverted 4.25 → 1.5", b.scores.acidity, 1.5);
eq("log2 sweetness", b.scores.sweetness, 5);
eq("log2 bitterness", b.scores.bitterness, 5);
eq("log2 body", b.scores.body, 5);
eq("log2 aftertaste", b.scores.aftertaste, 4);
eq("log2 balance", b.scores.balance, 4);
eq("log2 pour has bloom 48", /48\s*g/.test(b.pourTechnique ?? ""), true);
eq("log2 unmatched grinder warning", b.warnings.some((w) => /DF83V/i.test(w)), true);
eq("log2 grind records DF83V", /DF83V/i.test(b.grind ?? ""), true);
eq("log2 tasting has lime or tea", b.tastingNotes.some((n) => /lime|tea/i.test(n)), true);

// Don't match "Cold Brew Hario" just because the log says Hario V60.
eq("log1 not cold brew", a.brewerId, "v60");

// Filename-only date when body has none.
const c = parseBrewLog("Dose: 18 g\nWater: 288 g at 91°C\n", catalog, "29_Aug_2026_Brew.md");
eq("filename date", c.date, "2026-08-29");
eq("filename dose", c.doseG, 18);
eq("filename water", c.waterG, 288);
eq("filename temp", c.tempC, 91);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
