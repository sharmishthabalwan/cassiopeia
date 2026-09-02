// Talks to the Auth + Storage emulators. Skips if they aren't running.
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { connectStorageEmulator, getBytes, getStorage, ref, uploadString } from "firebase/storage";
import { JOURNAL_STORAGE_PATH, mergeJournal, parseJournal, emptyJournal } from "./journal.ts";
import type { Brew } from "./types.ts";

const AUTH = "http://127.0.0.1:9099";
const STORAGE_HOST = "127.0.0.1";
const STORAGE_PORT = 9199;

function brew(id: string, date: string, extra?: Partial<Brew>): Brew {
  return { id, date, bagId: "bag-4", brewerId: "v60", withFriends: false, friendIds: [], ...extra };
}

try {
  const ping = await fetch(AUTH);
  if (!ping.ok && ping.status === 0) throw new Error("down");
} catch {
  console.log("skip  firebase emulators not running (auth :9099)");
  process.exit(0);
}

const app = initializeApp({
  apiKey: "demo",
  authDomain: "demo-cassiopeia.firebaseapp.com",
  projectId: "demo-cassiopeia",
  storageBucket: "demo-cassiopeia.appspot.com",
  appId: "demo",
});
const auth = getAuth(app);
const storage = getStorage(app);
connectAuthEmulator(auth, AUTH, { disableWarnings: true });
connectStorageEmulator(storage, STORAGE_HOST, STORAGE_PORT);

const email = `sam-${Date.now()}@example.com`;
const cred = await createUserWithEmailAndPassword(auth, email, "coffee-journal");
const uid = cred.user.uid;

const deviceA = {
  ...emptyJournal(Date.now()),
  brews: [
    brew("brew-1", "2026-05-19"),
    brew("brew-31-aug", "2026-08-31", { doseG: 17.2, notes: "tea-like lime" }),
  ],
};

await uploadString(ref(storage, JOURNAL_STORAGE_PATH(uid)), JSON.stringify(deviceA), "raw", {
  contentType: "application/json",
});

const bytes = await getBytes(ref(storage, JOURNAL_STORAGE_PATH(uid)));
const remote = parseJournal(new TextDecoder().decode(bytes));
const deviceB = { ...emptyJournal(1), brews: [brew("brew-1", "2026-05-19")] };
const merged = mergeJournal(deviceB, remote);
const found = merged.brews.find((b) => b.id === "brew-31-aug");

if (!found || found.doseG !== 17.2) {
  console.error("FAIL other device did not receive 31 Aug brew", merged.brews);
  process.exit(1);
}
console.log("ok   emulator round-trip kept 31 Aug brew for", email);
console.log("\nall passed");
