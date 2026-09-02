// Journal snapshot: the Cloud Storage object we round-trip (snapshot in, snapshot out).
// Merge is union-by-id; when both sides have the same id, the newer snapshot wins.

import type {
  Appearance, Bag, Brew, BrewIdea, Brewer, Grinder, GlobalRecipe, Person, Rating,
} from "./types";

export const JOURNAL_VERSION = 1 as const;
export const JOURNAL_STORAGE_PATH = (uid: string) => `users/${uid}/journal.json`;

export interface JournalSnapshot {
  v: typeof JOURNAL_VERSION;
  updatedAt: number;
  bags: Bag[];
  brews: Brew[];
  ratings: Rating[];
  ideas: BrewIdea[];
  recipes: GlobalRecipe[];
  brewers: Brewer[];
  grinders: Grinder[];
  people: Person[];
  appearance?: Appearance;
}

const COLLECTIONS = [
  "bags", "brews", "ratings", "ideas", "recipes", "brewers", "grinders", "people",
] as const;

export type JournalCollection = (typeof COLLECTIONS)[number];

type IdRow = { id: string };

function mergeById<T extends IdRow>(newer: T[], older: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of older) map.set(item.id, item);
  for (const item of newer) map.set(item.id, item);
  return [...map.values()];
}

export function emptyJournal(updatedAt = 0): JournalSnapshot {
  return {
    v: JOURNAL_VERSION,
    updatedAt,
    bags: [], brews: [], ratings: [], ideas: [], recipes: [],
    brewers: [], grinders: [], people: [],
  };
}

/** Union local + remote. Same-id conflicts take the side with the later updatedAt. */
export function mergeJournal(local: JournalSnapshot, remote: JournalSnapshot | null): JournalSnapshot {
  if (!remote) {
    return { ...local, v: JOURNAL_VERSION, updatedAt: Math.max(local.updatedAt, Date.now()) };
  }
  const localNewer = (local.updatedAt || 0) >= (remote.updatedAt || 0);
  const newer = localNewer ? local : remote;
  const older = localNewer ? remote : local;
  const updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0, Date.now());
  return {
    v: JOURNAL_VERSION,
    updatedAt,
    bags: mergeById(newer.bags, older.bags),
    brews: mergeById(newer.brews, older.brews),
    ratings: mergeById(newer.ratings, older.ratings),
    ideas: mergeById(newer.ideas, older.ideas),
    recipes: mergeById(newer.recipes, older.recipes),
    brewers: mergeById(newer.brewers, older.brewers),
    grinders: mergeById(newer.grinders, older.grinders),
    people: mergeById(newer.people, older.people),
    appearance: newer.appearance ?? older.appearance,
  };
}

export function journalChanged(a: JournalSnapshot, b: JournalSnapshot | null): boolean {
  if (!b) return true;
  for (const key of COLLECTIONS) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) return true;
  }
  return JSON.stringify(a.appearance ?? null) !== JSON.stringify(b.appearance ?? null);
}

export function parseJournal(raw: string): JournalSnapshot {
  const data = JSON.parse(raw) as Partial<JournalSnapshot>;
  const base = emptyJournal(typeof data.updatedAt === "number" ? data.updatedAt : 0);
  for (const key of COLLECTIONS) {
    const rows = data[key];
    if (Array.isArray(rows)) base[key] = rows as never;
  }
  if (data.appearance) base.appearance = data.appearance;
  return base;
}
