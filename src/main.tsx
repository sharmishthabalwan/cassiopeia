// Sam Caffeinated — app entry (Foundation).
// Boots the router, applies Material 3 appearance (mode + dynamic color seed),
// runs first-run import, renders the current tab + compact nav bar / rail.
//
// Tab mounting: each tabs/<id>/index.tsx is lazy-loaded; if it default-exports
// a component it is rendered, otherwise the Foundation fallback screen shows a
// raw list for that tab. Tab agents therefore ship by adding a default export
// in their own folder — main.tsx never changes.

import { render, type ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./material";
import "./theme.css";
import "./app.css";
import { TABS } from "./nav.config";
import { currentTab, go, onRouteChange } from "./router";
import { db, APPEARANCE_EVENT } from "./lib/db";
import { APP_NAME, type Appearance } from "./lib/types";
import { applyMd3Theme } from "./lib/md3";
import { seedFromFiles } from "./lib/import";
import { Fallback } from "./fallback";

// ---- appearance -----------------------------------------------------------

function useAppearance(initial: Appearance): Appearance {
  const [appearance, setAppearance] = useState(initial);
  useEffect(() => {
    const handler = (e: Event) => {
      const a = (e as CustomEvent<Appearance>).detail;
      applyMd3Theme(a, currentTab());
      setAppearance(a);
    };
    addEventListener(APPEARANCE_EVENT, handler);
    return () => removeEventListener(APPEARANCE_EVENT, handler);
  }, []);
  return appearance;
}

// ---- tab loading ----------------------------------------------------------

const tabModules = import.meta.glob<{ default?: ComponentType }>("./tabs/*/index.tsx");

async function loadTab(id: string): Promise<ComponentType> {
  const loader = tabModules[`./tabs/${id}/index.tsx`];
  if (loader) {
    try {
      const mod = await loader();
      if (typeof mod.default === "function") return mod.default;
    } catch (err) {
      console.error(`tab "${id}" failed to load, using fallback`, err);
    }
  }
  return () => <Fallback tab={id} />;
}

// ---- persistent logo + Material 3 navigation ------------------------------

const LOGO_SRC = `${import.meta.env.BASE_URL}icon-192.png`;

/** App mark beside the screen heading — always a one-tap route Home.
 *  Shown in the compact top app bar; hidden once the nav rail takes over. */
function AppLogo() {
  return (
    <button class="app-logo" aria-label={`${APP_NAME} — home`} onClick={() => go("home")}>
      <img src={LOGO_SRC} alt="" width="32" height="32" />
    </button>
  );
}

function NavItem({
  id, label, symbol, current, className,
}: { id: string; label: string; symbol: string; current: string; className: string }) {
  const active = id === current;
  return (
    <button
      class={`${className}${active ? " active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={() => go(id)}
    >
      <span class="nav-indicator">
        <md-icon>{symbol}</md-icon>
      </span>
      <span class={className === "rail-item" ? "rail-label" : "nav-label"}>{label}</span>
    </button>
  );
}

/** Compact bottom navigation bar. Hidden from 768px up (rail takes over). */
function NavBar({ current }: { current: string }) {
  return (
    <nav class="nav-bar" aria-label="Primary">
      {TABS.filter((t) => t.enabled).map((t) => (
        <NavItem
          key={t.id}
          id={t.id}
          label={t.label}
          symbol={t.symbol}
          current={current}
          className="nav-bar-item"
        />
      ))}
    </nav>
  );
}

/** Medium/expanded navigation rail. Reads nav.config like the bar. */
function NavRail({ current }: { current: string }) {
  return (
    <nav class="nav-rail" aria-label="Primary">
      <button class="rail-logo" aria-label={`${APP_NAME} — home`} onClick={() => go("home")}>
        <img src={LOGO_SRC} alt="" width="40" height="40" />
        <span class="rail-wordmark">{APP_NAME}</span>
      </button>
      <div class="rail-tabs">
        {TABS.filter((t) => t.enabled).map((t) => (
          <NavItem
            key={t.id}
            id={t.id}
            label={t.label}
            symbol={t.symbol}
            current={current}
            className="rail-item"
          />
        ))}
      </div>
    </nav>
  );
}

// ---- app ------------------------------------------------------------------

function App({ initialAppearance }: { initialAppearance: Appearance }) {
  const appearance = useAppearance(initialAppearance);
  const [tab, setTab] = useState(currentTab());
  const [Screen, setScreen] = useState<ComponentType | null>(null);

  useEffect(() => onRouteChange(() => setTab(currentTab())), []);
  useEffect(() => {
    applyMd3Theme(appearance, tab);
  }, [appearance, tab]);
  useEffect(() => {
    let live = true;
    setScreen(null);
    loadTab(tab).then((C) => { if (live) setScreen(() => C); });
    return () => { live = false; };
  }, [tab]);

  const def = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div class={`screen hue-${tab}`}>
      <NavRail current={tab} />
      <div class="body">
        <header class="top-app-bar">
          <AppLogo />
          <h1>{def.label}</h1>
        </header>
        {Screen && <Screen />}
      </div>
      <NavBar current={tab} />
    </div>
  );
}

async function boot() {
  const appearance = await db.getAppearance();
  applyMd3Theme(appearance, currentTab());
  try {
    await seedFromFiles();
  } catch (err) {
    console.error("first-run import failed (app still boots)", err);
  }
  render(<App initialAppearance={appearance} />, document.getElementById("app")!);
}

boot();
