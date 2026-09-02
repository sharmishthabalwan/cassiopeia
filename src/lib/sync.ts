// Cloud sync orchestrator. Local IndexedDB stays the working copy; Cloud Storage
// holds one JSON snapshot per signed-in user. First sign-in uploads whatever is
// already on this device (including a brew you logged before cloud existed).

import { get, set } from "idb-keyval";
import type {
  Appearance, Bag, Brew, BrewIdea, Brewer, CloudStatus, Grinder, GlobalRecipe, ID, Person, Rating,
} from "./types";
import { _internal, APPEARANCE_EVENT } from "./db";
import {
  cloudErrorMessage, completeGoogleRedirect, createAccount, currentUser, downloadJournal,
  signInEmail, signInGoogle, signOutCloud, subscribeAuth, uploadJournal,
  waitForUser,
} from "./firebase";
import { emptyJournal, journalChanged, mergeJournal, type JournalSnapshot } from "./journal";
import { firebaseConfigured } from "./cloud-config";

export const CLOUD_EVENT = "cassiopeia:cloud";
export const SYNC_EVENT = "cassiopeia:sync";

type CollectionKey =
  | "bags" | "brews" | "ratings" | "ideas" | "recipes"
  | "brewers" | "grinders" | "people";

const KEYS: CollectionKey[] = [
  "bags", "brews", "ratings", "ideas", "recipes", "brewers", "grinders", "people",
];

let status: CloudStatus = {
  configured: firebaseConfigured(),
  user: null,
  state: "idle",
};
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let authWired = false;
let hydrating = false;

function emitCloud() {
  dispatchEvent(new CustomEvent<CloudStatus>(CLOUD_EVENT, { detail: { ...status } }));
}

function emitSync() {
  dispatchEvent(new CustomEvent(SYNC_EVENT));
}

function setStatus(patch: Partial<CloudStatus>) {
  status = { ...status, ...patch };
  emitCloud();
}

function userInfo(uid: string, email: string | null) {
  return { uid, email };
}

async function readLocalJournal(): Promise<JournalSnapshot> {
  const updatedAt = (await get<number>("cloudUpdatedAt", _internal.store)) ?? 0;
  const appearance = await get<Appearance>("appearance", _internal.store);
  const [bags, brews, ratings, ideas, recipes, brewers, grinders, people] = await Promise.all(
    KEYS.map((k) => _internal.readCollection(k)),
  );
  return {
    v: 1,
    updatedAt,
    bags: bags as Bag[],
    brews: brews as Brew[],
    ratings: ratings as Rating[],
    ideas: ideas as BrewIdea[],
    recipes: recipes as GlobalRecipe[],
    brewers: brewers as Brewer[],
    grinders: grinders as Grinder[],
    people: people as Person[],
    appearance: appearance ?? undefined,
  };
}

async function applyJournal(journal: JournalSnapshot): Promise<void> {
  _internal.beginRemoteApply();
  try {
    await Promise.all(KEYS.map((k) => _internal.putCollection(k, journal[k] as { id: ID }[])));
    if (journal.appearance) {
      await set("appearance", journal.appearance, _internal.store);
      dispatchEvent(new CustomEvent<Appearance>(APPEARANCE_EVENT, { detail: journal.appearance }));
    }
    await set("cloudUpdatedAt", journal.updatedAt, _internal.store);
  } finally {
    _internal.endRemoteApply();
  }
}

async function linkedUid(): Promise<string | undefined> {
  return get<string>("cloudUid", _internal.store);
}

export function getCloudStatus(): CloudStatus {
  return { ...status };
}

export function subscribeCloud(cb: (s: CloudStatus) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<CloudStatus>).detail);
  addEventListener(CLOUD_EVENT, handler);
  cb(getCloudStatus());
  return () => removeEventListener(CLOUD_EVENT, handler);
}

export async function hydrateCloud(): Promise<void> {
  if (!firebaseConfigured() || hydrating) return;
  hydrating = true;
  try {
    await completeGoogleRedirect();
    const user = await waitForUser();
    status.configured = true;
    status.user = user ? userInfo(user.uid, user.email) : null;
    if (!user) {
      setStatus({ state: "idle", error: undefined });
      return;
    }
    await pullAndPush(user.uid, user.email);
  } catch (err) {
    setStatus({ state: "error", error: cloudErrorMessage(err) });
    console.error("cloud hydrate failed", err);
  } finally {
    hydrating = false;
  }
}

async function pullAndPush(uid: string, email: string | null): Promise<void> {
  setStatus({ user: userInfo(uid, email), state: "syncing", error: undefined });
  const prevUid = await linkedUid();
  const remote = await downloadJournal(uid);
  let local = await readLocalJournal();

  // Switching accounts on this browser: don't merge the previous person's journal up.
  if (prevUid && prevUid !== uid) {
    local = remote ? { ...remote, updatedAt: Math.max(remote.updatedAt, Date.now()) } : emptyJournal(Date.now());
  }

  const merged = mergeJournal(local, remote);
  await applyJournal(merged);
  await set("cloudUid", uid, _internal.store);

  if (journalChanged(merged, remote)) {
    merged.updatedAt = Date.now();
    await set("cloudUpdatedAt", merged.updatedAt, _internal.store);
    await uploadJournal(uid, merged);
  }
  setStatus({ state: "idle", lastSyncedAt: Date.now(), error: undefined });
  emitSync();
}

export function schedulePush(): void {
  if (!firebaseConfigured()) return;
  if (!currentUser() && !status.user) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { void pushNow(); }, 800);
}

async function pushNow(): Promise<void> {
  const user = currentUser();
  if (!user) return;
  try {
    setStatus({ state: "syncing", error: undefined });
    const local = await readLocalJournal();
    local.updatedAt = Date.now();
    await set("cloudUpdatedAt", local.updatedAt, _internal.store);
    await uploadJournal(user.uid, local);
    setStatus({ state: "idle", lastSyncedAt: Date.now(), error: undefined });
  } catch (err) {
    setStatus({ state: "error", error: cloudErrorMessage(err) });
    console.error("cloud push failed", err);
  }
}

export async function syncNow(): Promise<void> {
  const user = currentUser() ?? (await waitForUser());
  if (!user) throw new Error("Sign in to sync across devices.");
  await pullAndPush(user.uid, user.email);
}

async function withAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const message = cloudErrorMessage(err);
    setStatus({ state: "error", error: message });
    throw new Error(message);
  }
}

export async function cloudSignIn(email: string, password: string): Promise<void> {
  await withAuth(async () => {
    const user = await signInEmail(email, password);
    await pullAndPush(user.uid, user.email);
  });
}

export async function cloudCreateAccount(email: string, password: string): Promise<void> {
  await withAuth(async () => {
    const user = await createAccount(email, password);
    await pullAndPush(user.uid, user.email);
  });
}

export async function cloudSignInGoogle(): Promise<void> {
  await withAuth(async () => {
    const user = await signInGoogle();
    if (user?.uid) await pullAndPush(user.uid, user.email);
  });
}

export async function cloudSignOut(): Promise<void> {
  if (pushTimer) clearTimeout(pushTimer);
  await signOutCloud();
  setStatus({ user: null, state: "idle", error: undefined });
}

export function wireAuthListener(): void {
  if (authWired || !firebaseConfigured()) return;
  authWired = true;
  subscribeAuth((user) => {
    status.user = user ? userInfo(user.uid, user.email) : null;
    emitCloud();
  });
}

export { cloudErrorMessage };
export { firebaseConfigured } from "./cloud-config";
