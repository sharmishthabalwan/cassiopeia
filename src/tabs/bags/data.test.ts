// Self-running checks for bags helpers (peak window, sort, photo src).
import { daysSinceRoast, nextSr, peakInfo, photoSrc, sortBags } from "./data.ts";
import type { Bag } from "../../lib/types.ts";

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

const asOf = new Date(2026, 7, 31); // 31 Aug 2026

eq("days since roast", daysSinceRoast("2026-08-24", asOf), 7);
eq("resting day 3", peakInfo("2026-08-28", asOf)?.phase, "resting");
eq("peak day 7", peakInfo("2026-08-24", asOf)?.phase, "peak");
eq("peak day 21", peakInfo("2026-08-10", asOf)?.phase, "peak");
eq("past day 22", peakInfo("2026-08-09", asOf)?.phase, "past");
eq("missing roast", peakInfo(undefined, asOf), undefined);

const bags: Bag[] = [
  { id: "f", roaster: "A", coffeeName: "Finished", finished: true, frozen: false, roastDate: "2026-08-01", sr: 3 },
  { id: "z", roaster: "A", coffeeName: "Frozen", finished: false, frozen: true, roastDate: "2026-08-20", sr: 2 },
  { id: "o", roaster: "A", coffeeName: "Open", finished: false, frozen: false, roastDate: "2026-08-10", sr: 1 },
  { id: "o2", roaster: "A", coffeeName: "Open newer", finished: false, frozen: false, roastDate: "2026-08-15", sr: 4 },
];
eq("sort order", sortBags(bags).map((b) => b.id), ["o2", "o", "z", "f"]);
eq("next sr", nextSr(bags), 5);

eq("photo filename", photoSrc("sey_wilson-alba.jpg")?.endsWith("photos/sey_wilson-alba.jpg"), true);
eq("photo data url", photoSrc("data:image/webp;base64,xx"), "data:image/webp;base64,xx");
eq("photo missing", photoSrc(undefined), undefined);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall ok");
