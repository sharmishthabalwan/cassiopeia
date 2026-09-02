// Tiny env check — no Firebase SDK. Lets boot skip the 200kb cloud chunk
// until VITE_FIREBASE_* is actually set.

export function firebaseConfigured(): boolean {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();
  return !!(apiKey && projectId && appId);
}

export function firebaseUsingEmulator(): boolean {
  return import.meta.env.VITE_FIREBASE_EMULATOR === "1" || import.meta.env.VITE_FIREBASE_EMULATOR === "true";
}
