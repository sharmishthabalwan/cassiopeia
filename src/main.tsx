// Cassiopeia — app entry (Foundation).
// Boots the router, applies saved Appearance (mode + hue), runs first-run
// import, renders the current tab + the liquid FAB.
//
// Tab mounting: each tabs/<id>/index.tsx is lazy-loaded; if it default-exports
// a component it is rendered, otherwise the Foundation fallback screen shows a
// raw list for that tab. Tab agents therefore ship by adding a default export
// in their own folder — main.tsx never changes.

import { render, type ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./theme.css";
import "./app.css";
import { TABS } from "./nav.config";
import { currentTab, go, onRouteChange } from "./router";
import { db, APPEARANCE_EVENT } from "./lib/db";
import type { Appearance } from "./lib/types";
import { seedFromFiles } from "./lib/import";
import { Fallback } from "./fallback";

// ---- appearance -----------------------------------------------------------

function applyAppearance(a: Appearance) {
  const html = document.documentElement;
  html.dataset.mode = a.mode;
  html.classList.toggle("uniform-hue", a.hueMode === "uniform");
  if (a.hueMode === "uniform" && a.uniform) {
    html.style.setProperty("--u1", a.uniform.a1);
    html.style.setProperty("--u2", a.uniform.a2);
  }
}

function useAppearance(initial: Appearance): Appearance {
  const [appearance, setAppearance] = useState(initial);
  useEffect(() => {
    const handler = (e: Event) => {
      const a = (e as CustomEvent<Appearance>).detail;
      applyAppearance(a);
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

// ---- liquid FAB -----------------------------------------------------------

function GooFilter() {
  return (
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <filter id="cassiopeia-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

function Fab({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const tabs = TABS.filter((t) => t.enabled);
  const n = tabs.length;
  // nav.config order = top→bottom of the expanded stack; --i counts from the
  // main button upward, so the first tab gets the largest lift.
  const lift = (idx: number) => `--i:${n - 1 - idx}`;
  const pick = (id: string) => { go(id); setOpen(false); };
  return (
    <>
      {open && <button class="fab-scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div class={`fab-wrap${open ? " open" : ""}`}>
        <div class="fab-goo">
          {tabs.map((t, i) => <div class={`fab-blob hue-${t.id}`} style={lift(i)} />)}
          <div class="fab-blob main" />
        </div>
        <div class="fab-ui">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              class={`fab-btn${t.id === current ? " active" : ""} hue-${t.id}`}
              style={lift(i)}
              tabIndex={open ? 0 : -1}
              aria-hidden={!open}
              onClick={() => pick(t.id)}
            >
              {t.icon}
              <span class="fab-label">{t.label}</span>
            </button>
          ))}
          <button class="fab-btn main" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
            <span class="fab-plus">+</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ---- persistent logo (always) + desktop nav-rail --------------------------

const LOGO_SRC = `${import.meta.env.BASE_URL}icon-192.png`;

/** Cassiopeia mark beside the screen heading — always a one-tap route Home.
 *  Sits inline to the LEFT of <h1> on mobile/tablet; hidden on desktop
 *  (the nav-rail carries its own logo there). */
function AppLogo() {
  return (
    <button class="app-logo" aria-label="Cassiopeia — home" onClick={() => go("home")}>
      <img src={LOGO_SRC} alt="" width="30" height="30" />
    </button>
  );
}

/** Desktop-only left navigation rail (>=1100px). Reads nav.config like the FAB;
 *  the FAB is hidden at that width. Logo on top routes Home. */
function NavRail({ current }: { current: string }) {
  return (
    <nav class="nav-rail" aria-label="Primary">
      <button class="rail-logo" aria-label="Cassiopeia — home" onClick={() => go("home")}>
        <img src={LOGO_SRC} alt="" width="40" height="40" />
        <span class="rail-wordmark">Cassiopeia</span>
      </button>
      <div class="rail-tabs">
        {TABS.filter((t) => t.enabled).map((t) => (
          <button
            key={t.id}
            class={`rail-item hue-${t.id}${t.id === current ? " active" : ""}`}
            aria-current={t.id === current ? "page" : undefined}
            onClick={() => go(t.id)}
          >
            <span class="rail-icon">{t.icon}</span>
            <span class="rail-label">{t.label}</span>
          </button>
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
    let live = true;
    setScreen(null);
    loadTab(tab).then((C) => { if (live) setScreen(() => C); });
    return () => { live = false; };
  }, [tab]);

  const def = TABS.find((t) => t.id === tab) ?? TABS[0];
  // Custom per-tab hue pairs (Appearance.perTab) override the theme defaults.
  const custom = appearance.hueMode === "perTab" ? appearance.perTab?.[tab] : undefined;
  const hueStyle = custom ? `--a1:${custom.a1};--a2:${custom.a2}` : undefined;

  return (
    <div class={`screen hue-${tab}`} style={hueStyle}>
      <NavRail current={tab} />
      <div class="body">
        <div class="screen-head">
          <AppLogo />
          <h1>{def.label}</h1>
        </div>
        {Screen && <Screen />}
      </div>
      <GooFilter />
      <Fab current={tab} />
    </div>
  );
}

async function boot() {
  const appearance = await db.getAppearance();
  applyAppearance(appearance);
  try {
    await seedFromFiles();
  } catch (err) {
    console.error("first-run import failed (app still boots)", err);
  }
  render(<App initialAppearance={appearance} />, document.getElementById("app")!);
}

boot();
