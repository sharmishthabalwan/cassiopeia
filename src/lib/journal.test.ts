// Merge checks: a brew logged on one device must survive a pull on another.
import { emptyJournal, journalChanged, mergeJournal, parseJournal, type JournalSnapshot } from "./journal.ts";
import type { Brew } from "./types.ts";

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

function brew(id: string, date: string, extra?: Partial<Brew>): Brew {
  return {
    id, date, bagId: "bag-4", brewerId: "v60",
    withFriends: false, friendIds: [],
    ...extra,
  };
}

const seed: JournalSnapshot = {
  ...emptyJournal(1_000),
  brews: [brew("brew-1", "2026-05-19"), brew("brew-6", "2026-06-04")],
  bags: [{ id: "bag-4", roaster: "Sey", coffeeName: "Wilson Alba", finished: false, frozen: true }],
};

const logged31 = brew("brew-31-aug", "2026-08-31", { doseG: 17.2, waterG: 276, tempC: 93, notes: "tea-like" });

const deviceA: JournalSnapshot = {
  ...seed,
  updatedAt: 2_000,
  brews: [...seed.brews, logged31],
};

const deviceB: JournalSnapshot = {
  ...seed,
  updatedAt: 1_500,
};

const pulled = mergeJournal(deviceB, deviceA);
eq("other device keeps 31 Aug brew", pulled.brews.some((b) => b.id === "brew-31-aug"), true);
eq("other device keeps seed brews", pulled.brews.map((b) => b.id).sort(), ["brew-1", "brew-31-aug", "brew-6"]);
eq("31 Aug fields survive", pulled.brews.find((b) => b.id === "brew-31-aug")?.doseG, 17.2);

const aThenB = mergeJournal(deviceA, {
  ...deviceB,
  updatedAt: 3_000,
  brews: [...deviceB.brews, brew("brew-1-sep", "2026-09-01")],
});
eq("both devices' new brews kept", aThenB.brews.map((b) => b.id).sort(), [
  "brew-1", "brew-1-sep", "brew-31-aug", "brew-6",
]);

const conflictLocal: JournalSnapshot = {
  ...seed,
  updatedAt: 5_000,
  brews: [brew("brew-1", "2026-05-19", { notes: "local edit" }), brew("brew-6", "2026-06-04")],
};
const conflictRemote: JournalSnapshot = {
  ...seed,
  updatedAt: 4_000,
  brews: [brew("brew-1", "2026-05-19", { notes: "older cloud edit" }), brew("brew-6", "2026-06-04")],
};
eq("newer snapshot wins same-id conflict", mergeJournal(conflictLocal, conflictRemote).brews.find((b) => b.id === "brew-1")?.notes, "local edit");

eq("null remote keeps local 31 Aug", mergeJournal(deviceA, null).brews.some((b) => b.id === "brew-31-aug"), true);
eq("changed vs empty remote", journalChanged(deviceA, null), true);
eq("unchanged vs copy", journalChanged(deviceA, { ...deviceA, updatedAt: 9 }), false);
eq("changed when a brew is missing", journalChanged(deviceA, deviceB), true);

const parsed = parseJournal(JSON.stringify({ v: 1, updatedAt: 12, brews: [logged31] }));
eq("parse keeps 31 Aug", parsed.brews[0]?.id, "brew-31-aug");
eq("parse fills missing collections", parsed.bags, []);

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
