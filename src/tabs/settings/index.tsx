// Settings tab — appearance + Firebase cloud journal (Auth + Cloud Storage).
// Brews you log live in this browser until you sign in; then a snapshot is
// stored at users/{uid}/journal.json so another phone/Mac sees the same cups.

import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { db } from "../../lib/db";
import { HOME_HUE, type Appearance, type CloudStatus } from "../../lib/types";
import "./settings.css";

function Field({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <label class="f-field">
      <span class="f-label">{label}</span>
      {children}
    </label>
  );
}

function fmtSynced(ts?: number): string {
  if (!ts) return "Not synced yet";
  const d = new Date(ts);
  return `Last synced ${d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
}

function CloudCard() {
  const [st, setSt] = useState<CloudStatus>(() => db.getCloudStatus());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => db.subscribeCloudStatus(setSt), []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setLocalError(null);
    try {
      await fn();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Cloud sync failed.");
    } finally {
      setBusy(false);
    }
  };

  const error = localError || st.error;

  if (!st.configured) {
    return (
      <div class="glass">
        <div class="f-section">Cloud journal</div>
        <p class="set-copy">
          Brews you log stay in <strong>this browser’s</strong> IndexedDB. That’s why a cup
          you saved on 31 Aug doesn’t show up when you open the app from somewhere else.
        </p>
        <p class="set-copy">
          To sync iPhone and Mac, create a Firebase project, enable Email/Password (and
          Google if you want), turn on Cloud Storage, deploy <code>storage.rules</code>,
          and add the <code>VITE_FIREBASE_*</code> keys — see the README.
        </p>
      </div>
    );
  }

  if (st.user) {
    return (
      <div class="glass">
        <div class="f-section">Cloud journal</div>
        <p class="set-copy">
          Signed in as <strong>{st.user.email || "your Google account"}</strong>. New brews
          upload to Firebase Cloud Storage so other devices signed in with this account
          can pull them.
        </p>
        <div class="set-sync-meta">
          {st.state === "syncing" ? "Syncing…" : fmtSynced(st.lastSyncedAt)}
        </div>
        {error && <div class="set-error">{error}</div>}
        <div class="seg set-actions">
          <button class="btn" disabled={busy || st.state === "syncing"} onClick={() => run(() => db.syncNow())}>
            Sync now
          </button>
          <button class="btn ghost" disabled={busy} onClick={() => run(() => db.signOutCloud())}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div class="glass">
      <div class="f-section">Cloud journal</div>
      <p class="set-copy">
        Sign in on each device with the same account. The 31 Aug brew (and anything else
        already in this browser) uploads on first sign-in, then follows you.
      </p>
      <Field label="Email">
        <input
          class="f-input"
          type="email"
          autocomplete="email"
          value={email}
          onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
        />
      </Field>
      <Field label="Password">
        <input
          class="f-input"
          type="password"
          autocomplete="current-password"
          value={password}
          onInput={(e) => setPassword((e.currentTarget as HTMLInputElement).value)}
        />
      </Field>
      {error && <div class="set-error">{error}</div>}
      <div class="seg set-actions">
        <button
          class="btn"
          disabled={busy || !email.trim() || password.length < 6}
          onClick={() => run(() => db.signInCloud(email, password))}
        >
          Sign in
        </button>
        <button
          class="btn ghost"
          disabled={busy || !email.trim() || password.length < 6}
          onClick={() => run(() => db.createCloudAccount(email, password))}
        >
          Create account
        </button>
      </div>
      <button
        class="btn ghost set-google"
        disabled={busy}
        onClick={() => run(() => db.signInCloudGoogle())}
      >
        Continue with Google
      </button>
    </div>
  );
}

export default function SettingsScreen() {
  const [app, setApp] = useState<Appearance | null>(null);
  const [catalog, setCatalog] = useState<{
    brewers: { id: string; name: string }[];
    grinders: { id: string; name: string }[];
    people: { id: string; name: string; color: string; isSelf?: boolean }[];
  } | null>(null);

  useEffect(() => { db.getAppearance().then(setApp); }, []);
  useEffect(() => {
    (async () => {
      const [brewers, grinders, people] = await Promise.all([
        db.listBrewers(), db.listGrinders(), db.listPeople(),
      ]);
      setCatalog({ brewers, grinders, people });
    })();
  }, []);

  if (!app) return <div class="sub">Loading…</div>;
  const save = (next: Appearance) => { setApp(next); db.setAppearance(next); };

  return (
    <div>
      <CloudCard />
      <div class="glass">
        <div class="f-section">Appearance</div>
        <div class="sub">Mode</div>
        <div class="seg">
          <button class={`btn${app.mode === "dark" ? "" : " ghost"}`} onClick={() => save({ ...app, mode: "dark" })}>Dark</button>
          <button class={`btn${app.mode === "light" ? "" : " ghost"}`} onClick={() => save({ ...app, mode: "light" })}>Light</button>
        </div>
        <div class="sub" style="margin-top:12px">Hue</div>
        <div class="seg">
          <button class={`btn${app.hueMode === "perTab" ? "" : " ghost"}`} onClick={() => save({ ...app, hueMode: "perTab" })}>Per-tab</button>
          <button
            class={`btn${app.hueMode === "uniform" ? "" : " ghost"}`}
            onClick={() => save({ ...app, hueMode: "uniform", uniform: app.uniform ?? { a1: HOME_HUE.a1, a2: HOME_HUE.a2 } })}
          >
            Uniform
          </button>
        </div>
      </div>
      {catalog && (
        <div class="glass">
          <div class="sub" style="margin-bottom:6px">Brewers</div>
          {catalog.brewers.map((b) => <div class="raw-item" key={b.id}><span>{b.name}</span></div>)}
          <div class="sub" style="margin:10px 0 6px">Grinders</div>
          {catalog.grinders.map((g) => <div class="raw-item" key={g.id}><span>{g.name}</span></div>)}
          <div class="sub" style="margin:10px 0 6px">People</div>
          {catalog.people.map((p) => (
            <div class="raw-item" key={p.id}>
              <span style={`display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color}`} />
              <span>{p.name}{p.isSelf ? " (you)" : ""}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
