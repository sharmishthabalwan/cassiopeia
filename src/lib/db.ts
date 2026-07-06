// Cassiopeia — data access (CONTRACT-OWNED API surface).
// LOCAL-FIRST: everything reads/writes IndexedDB now (idb-keyval). A Supabase
// adapter gets layered in later (delta sync + storage) WITHOUT changing these
// signatures. Tabs must only ever touch data through this module.

import { createStore, get, set } from "idb-keyval";
import type { Bag, Brew, Rating, Person, BrewIdea, GlobalRecipe, Brewer, Grinder, Appearance, ID } from "./types";

export interface DB {
  // bags
  listBags(opts?: { includeFinished?: boolean }): Promise<Bag[]>;
  getBag(id: ID): Promise<Bag | undefined>;
  upsertBag(bag: Bag): Promise<void>;
  // brews + ratings
  listBrews(): Promise<Brew[]>;
  getBrew(id: ID): Promise<Brew | undefined>;
  upsertBrew(brew: Brew): Promise<void>;
  ratingsForBrew(brewId: ID): Promise<Rating[]>;
  upsertRating(rating: Rating): Promise<void>;
  // ideas + global recipes
  listIdeas(): Promise<BrewIdea[]>;
  upsertIdea(idea: BrewIdea): Promise<void>;
  saveRecipeAsIdea(recipe: GlobalRecipe): Promise<BrewIdea>; // row-copy into ideas
  listRecipes(): Promise<GlobalRecipe[]>;
  // lookups
  listBrewers(): Promise<Brewer[]>;
  upsertBrewer(b: Brewer): Promise<void>;
  listGrinders(): Promise<Grinder[]>;
  upsertGrinder(g: Grinder): Promise<void>;
  listPeople(): Promise<Person[]>;
  upsertPerson(p: Person): Promise<void>;
  // settings
  getAppearance(): Promise<Appearance>;
  setAppearance(a: Appearance): Promise<void>;
}

// One IndexedDB database, one object store; each entity collection lives under
// a single key as an ordered array. Sized for 1–2 brews/day — whole-collection
// reads/writes are cheaper than cursors at this scale, and keep the future
// Supabase delta-sync adapter trivial (snapshot in, snapshot out).
const store = createStore("cassiopeia", "kv");

type CollectionKey =
  | "bags" | "brews" | "ratings" | "ideas" | "recipes"
  | "brewers" | "grinders" | "people";

async function readAll<T extends { id: ID }>(key: CollectionKey): Promise<T[]> {
  return (await get<T[]>(key, store)) ?? [];
}
async function writeAll<T extends { id: ID }>(key: CollectionKey, items: T[]): Promise<void> {
  await set(key, items, store);
}
async function upsert<T extends { id: ID }>(key: CollectionKey, item: T): Promise<void> {
  const items = await readAll<T>(key);
  const i = items.findIndex((x) => x.id === item.id);
  if (i >= 0) items[i] = item; else items.push(item);
  await writeAll(key, items);
}

export function newId(): ID {
  return crypto.randomUUID();
}

const DEFAULT_APPEARANCE: Appearance = { mode: "dark", hueMode: "perTab" };

// Fired after setAppearance persists, so the app shell re-applies the theme
// without tabs needing any channel beyond this module.
export const APPEARANCE_EVENT = "cassiopeia:appearance";

export const db: DB = {
  async listBags(opts) {
    const bags = await readAll<Bag>("bags");
    return opts?.includeFinished ? bags : bags.filter((b) => !b.finished);
  },
  async getBag(id) {
    return (await readAll<Bag>("bags")).find((b) => b.id === id);
  },
  upsertBag: (bag) => upsert("bags", bag),

  async listBrews() {
    const brews = await readAll<Brew>("brews");
    return brews.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first
  },
  async getBrew(id) {
    return (await readAll<Brew>("brews")).find((b) => b.id === id);
  },
  upsertBrew: (brew) => upsert("brews", brew),

  async ratingsForBrew(brewId) {
    return (await readAll<Rating>("ratings")).filter((r) => r.brewId === brewId);
  },
  upsertRating: (rating) => upsert("ratings", rating),

  listIdeas: () => readAll<BrewIdea>("ideas"),
  upsertIdea: (idea) => upsert("ideas", idea),

  async saveRecipeAsIdea(recipe) {
    // Row-copy of the canonical Recipe shape — never a transform.
    const { id: _id, name, why: _why, proId: _p, roasterId: _r, style: _s, ...recipeFields } = recipe;
    const idea: BrewIdea = { id: newId(), name, ...recipeFields };
    await upsert("ideas", idea);
    return idea;
  },
  listRecipes: () => readAll<GlobalRecipe>("recipes"),

  listBrewers: () => readAll<Brewer>("brewers"),
  upsertBrewer: (b) => upsert("brewers", b),
  listGrinders: () => readAll<Grinder>("grinders"),
  upsertGrinder: (g) => upsert("grinders", g),
  listPeople: () => readAll<Person>("people"),
  upsertPerson: (p) => upsert("people", p),

  async getAppearance() {
    return (await get<Appearance>("appearance", store)) ?? DEFAULT_APPEARANCE;
  },
  async setAppearance(a) {
    await set("appearance", a, store);
    dispatchEvent(new CustomEvent<Appearance>(APPEARANCE_EVENT, { detail: a }));
  },
};

// ---------------------------------------------------------------------------
// Internal seeding surface — used ONLY by lib/import.ts (Foundation-owned).
// Not part of the DB contract; tabs must never import these.
export const _internal = {
  async isEmpty(): Promise<boolean> {
    const [bags, brews, ideas] = await Promise.all([
      readAll<Bag>("bags"), readAll<Brew>("brews"), readAll<BrewIdea>("ideas"),
    ]);
    return bags.length === 0 && brews.length === 0 && ideas.length === 0;
  },
  async putCollection<T extends { id: ID }>(key: CollectionKey, items: T[]): Promise<void> {
    await writeAll(key, items);
  },
};
