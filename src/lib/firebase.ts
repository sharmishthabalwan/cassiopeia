// Firebase Auth + Cloud Storage (Foundation). The journal snapshot lives at
// users/{uid}/journal.json. Tabs never import this file — go through db.ts.

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  browserLocalPersistence, connectAuthEmulator, createUserWithEmailAndPassword, getAuth,
  getRedirectResult, GoogleAuthProvider, onAuthStateChanged, setPersistence,
  signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut,
  type Auth, type User,
} from "firebase/auth";
import {
  connectStorageEmulator, getBytes, getStorage, ref, uploadString, type FirebaseStorage,
} from "firebase/storage";
import { JOURNAL_STORAGE_PATH, parseJournal, type JournalSnapshot } from "./journal";
import { firebaseConfigured, firebaseUsingEmulator } from "./cloud-config";

export { firebaseConfigured, firebaseUsingEmulator };

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId: string;
}

function readConfig(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !projectId || !appId) return null;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim()
    || `${projectId}.appspot.com`;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim();
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

let app: FirebaseApp | null | undefined;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;
let emulatorWired = false;

function ensureApp(): { app: FirebaseApp; auth: Auth; storage: FirebaseStorage } | null {
  if (app === null) return null;
  if (app && auth && storage) return { app, auth, storage };
  const cfg = readConfig();
  if (!cfg) {
    app = null;
    return null;
  }
  app = initializeApp(cfg);
  auth = getAuth(app);
  storage = getStorage(app);
  void setPersistence(auth, browserLocalPersistence);
  if (firebaseUsingEmulator() && !emulatorWired) {
    emulatorWired = true;
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  }
  return { app, auth, storage };
}

export function currentUser(): User | null {
  return ensureApp()?.auth.currentUser ?? null;
}

export function waitForUser(): Promise<User | null> {
  const inst = ensureApp();
  if (!inst) return Promise.resolve(null);
  if (inst.auth.currentUser) return Promise.resolve(inst.auth.currentUser);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(inst.auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export function subscribeAuth(cb: (user: User | null) => void): () => void {
  const inst = ensureApp();
  if (!inst) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(inst.auth, cb);
}

export async function completeGoogleRedirect(): Promise<User | null> {
  const inst = ensureApp();
  if (!inst) return null;
  try {
    const result = await getRedirectResult(inst.auth);
    return result?.user ?? null;
  } catch {
    return null;
  }
}

export async function signInEmail(email: string, password: string): Promise<User> {
  const inst = ensureApp();
  if (!inst) throw new Error("Firebase isn’t configured.");
  const cred = await signInWithEmailAndPassword(inst.auth, email.trim(), password);
  return cred.user;
}

export async function createAccount(email: string, password: string): Promise<User> {
  const inst = ensureApp();
  if (!inst) throw new Error("Firebase isn’t configured.");
  const cred = await createUserWithEmailAndPassword(inst.auth, email.trim(), password);
  return cred.user;
}

export async function signInGoogle(): Promise<User | null> {
  const inst = ensureApp();
  if (!inst) throw new Error("Firebase isn’t configured.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const iOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  try {
    if (iOS) {
      await signInWithRedirect(inst.auth, provider);
      return inst.auth.currentUser;
    }
    const cred = await signInWithPopup(inst.auth, provider);
    return cred.user;
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      await signInWithRedirect(inst.auth, provider);
      return inst.auth.currentUser;
    }
    throw err;
  }
}

export async function signOutCloud(): Promise<void> {
  const inst = ensureApp();
  if (!inst) return;
  await signOut(inst.auth);
}

export async function downloadJournal(uid: string): Promise<JournalSnapshot | null> {
  const inst = ensureApp();
  if (!inst) return null;
  try {
    const bytes = await getBytes(ref(inst.storage, JOURNAL_STORAGE_PATH(uid)));
    return parseJournal(new TextDecoder().decode(bytes));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "storage/object-not-found") return null;
    throw err;
  }
}

export async function uploadJournal(uid: string, journal: JournalSnapshot): Promise<void> {
  const inst = ensureApp();
  if (!inst) return;
  const json = JSON.stringify(journal);
  await uploadString(ref(inst.storage, JOURNAL_STORAGE_PATH(uid)), json, "raw", {
    contentType: "application/json",
    cacheControl: "no-store",
  });
}

export function cloudErrorMessage(err: unknown): string {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
  const map: Record<string, string> = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/invalid-email": "That email doesn’t look valid.",
    "auth/user-not-found": "No account with that email — try Create account.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/email-already-in-use": "That email already has an account — sign in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "The sign-in popup was blocked. Allow popups, or use email.",
    "auth/unauthorized-domain": "Add this site to Firebase Auth → Authorized domains (localhost and sharmishthabalwan.github.io).",
    "auth/operation-not-allowed": "Enable Email/Password (or Google) under Firebase Auth → Sign-in method.",
    "auth/too-many-requests": "Too many attempts. Wait a minute and try again.",
    "storage/unauthorized": "Storage rules blocked the journal. Deploy storage.rules to this project.",
    "storage/retry-limit-exceeded": "Network dropped while syncing. Try Sync now.",
    "storage/object-not-found": "No cloud journal yet — the next save will create one.",
  };
  if (map[code]) return map[code];
  if (err instanceof Error && err.message) return err.message;
  return "Cloud sync failed.";
}
