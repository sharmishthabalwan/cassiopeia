// Cassiopeia — data access (CONTRACT-OWNED API surface).
// LOCAL-FIRST: everything reads/writes IndexedDB now (idb-keyval). Firebase
// Cloud Storage layers a per-user journal snapshot on top WITHOUT changing
// these signatures. Tabs must only ever touch data through this module.

import { createStore, get, set } from "idb-keyval";
import { HOME_HUE } from "./types";
import type {
  Bag, Brew, Rating, Person, BrewIdea, GlobalRecipe, Brewer, Grinder, Appearance, ID,
  CloudStatus,
} from "./types";
import { firebaseConfigured } from "./cloud-config";

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
  // cloud (Firebase Auth + Cloud Storage snapshot)
  getCloudStatus(): CloudStatus;
  subscribeCloudStatus(cb: (s: CloudStatus) => void): () => void;
  signInCloud(email: string, password: string): Promise<void>;
  createCloudAccount(email: string, password: string): Promise<void>;
  signInCloudGoogle(): Promise<void>;
  signOutCloud(): Promise<void>;
  syncNow(): Promise<void>;
}

// One IndexedDB database, one object store; each entity collection lives under
// a single key as an ordered array. Sized for 1–2 brews/day — whole-collection
// reads/writes are cheaper than cursors at this scale, and keep the Firebase
// snapshot adapter trivial (snapshot in, snapshot out).
const store = createStore("cassiopeia", "kv");

type CollectionKey =
  | "bags" | "brews" | "ratings" | "ideas" | "recipes"
  | "brewers" | "grinders" | "people";

let applyingRemote = 0;

async function readAll<T extends { id: ID }>(key: CollectionKey): Promise<T[]> {
  return (await get<T[]>(key, store)) ?? [];
}
async function persistAll<T extends { id: ID }>(key: CollectionKey, items: T[]): Promise<void> {
  await set(key, items, store);
}
async function writeAll<T extends { id: ID }>(key: CollectionKey, items: T[]): Promise<void> {
  await persistAll(key, items);
  if (applyingRemote) return;
  await set("cloudUpdatedAt", Date.now(), store);
  schedulePush();
}
async function upsert<T extends { id: ID }>(key: CollectionKey, item: T): Promise<void> {
  const items = await readAll<T>(key);
  const i = items.findIndex((x) => x.id === item.id);
  if (i >= 0) items[i] = item; else items.push(item);
  await writeAll(key, items);
}

function schedulePush() {
  if (!firebaseConfigured()) return;
  void import("./sync").then((m) => m.schedulePush());
}

function cloudApi() {
  return import("./sync").then((m) => {
    db.getCloudStatus = () => m.getCloudStatus();
    return m;
  });
}

export function newId(): ID {
  return crypto.randomUUID();
}

const DEFAULT_APPEARANCE: Appearance = {
  mode: "light",
  hueMode: "uniform",
  uniform: { a1: HOME_HUE.a1, a2: HOME_HUE.a2 },
};

// Fired after setAppearance persists, so the app shell re-applies the theme
// without tabs needing any channel beyond this module.
export const APPEARANCE_EVENT = "cassiopeia:appearance";
export const SYNC_EVENT = "cassiopeia:sync";
export const CLOUD_EVENT = "cassiopeia:cloud";

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
    const saved = await get<Appearance>("appearance", store);
    if (!saved) return DEFAULT_APPEARANCE;
    // Promote the old per-tab default (no custom per-tab colours) to uniform home pink.
    let next = saved;
    if (saved.hueMode === "perTab" && !saved.perTab) {
      next = { ...saved, hueMode: "uniform", uniform: saved.uniform ?? { a1: HOME_HUE.a1, a2: HOME_HUE.a2 } };
    } else if (saved.hueMode === "uniform" && !saved.uniform) {
      next = { ...saved, uniform: { a1: HOME_HUE.a1, a2: HOME_HUE.a2 } };
    }
    if (next !== saved) await set("appearance", next, store);
    return next;
  },
  async setAppearance(a) {
    await set("appearance", a, store);
    dispatchEvent(new CustomEvent<Appearance>(APPEARANCE_EVENT, { detail: a }));
    if (!applyingRemote) {
      await set("cloudUpdatedAt", Date.now(), store);
      schedulePush();
    }
  },

  getCloudStatus() {
    return {
      configured: firebaseConfigured(),
      user: null,
      state: "idle" as const,
    };
  },
  subscribeCloudStatus(cb) {
    if (!firebaseConfigured()) {
      cb({ configured: false, user: null, state: "idle" });
      return () => {};
    }
    let unsub = () => {};
    let cancelled = false;
    void cloudApi().then((m) => {
      if (cancelled) return;
      unsub = m.subscribeCloud(cb);
    });
    return () => { cancelled = true; unsub(); };
  },
  async signInCloud(email, password) {
    const m = await cloudApi();
    await m.cloudSignIn(email, password);
  },
  async createCloudAccount(email, password) {
    const m = await cloudApi();
    await m.cloudCreateAccount(email, password);
  },
  async signInCloudGoogle() {
    const m = await cloudApi();
    await m.cloudSignInGoogle();
  },
  async signOutCloud() {
    const m = await cloudApi();
    await m.cloudSignOut();
  },
  async syncNow() {
    const m = await cloudApi();
    await m.syncNow();
  },
};

// ---------------------------------------------------------------------------
// Internal seeding + cloud-apply surface — used ONLY by lib/import.ts and
// lib/sync.ts (Foundation-owned). Not part of the DB contract; tabs must never
// import these.
export const _internal = {
  store,
  beginRemoteApply() { applyingRemote += 1; },
  endRemoteApply() { applyingRemote = Math.max(0, applyingRemote - 1); },
  async isEmpty(): Promise<boolean> {
    const [bags, brews, ideas] = await Promise.all([
      readAll<Bag>("bags"), readAll<Brew>("brews"), readAll<BrewIdea>("ideas"),
    ]);
    return bags.length === 0 && brews.length === 0 && ideas.length === 0;
  },
  async readCollection<T extends { id: ID }>(key: CollectionKey): Promise<T[]> {
    return readAll<T>(key);
  },
  async putCollection<T extends { id: ID }>(key: CollectionKey, items: T[]): Promise<void> {
    await persistAll(key, items);
  },
};
