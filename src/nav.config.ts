// Cassiopeia — navigation registry (CONTRACT-OWNED).
// The liquid FAB and the router both read this. Adding a tab = one entry here.
// `hue` maps to the `hue-<id>` class in theme.css. `icon` is a glyph/emoji for now
// (swap to an icon set later). Order here = order in the expanded FAB stack.

export interface TabDef {
  id: string;        // also the route and the theme hue class suffix
  label: string;
  icon: string;
  enabled: boolean;  // feature flag
}

export const TABS: TabDef[] = [
  { id: "home",     label: "Home",     icon: "⌂", enabled: true },
  { id: "brews",    label: "Brews",    icon: "☕", enabled: true },
  { id: "bags",     label: "Bags",     icon: "🛍", enabled: true },
  { id: "ideas",    label: "Ideas",    icon: "✦", enabled: true },
  { id: "insights", label: "Insights", icon: "◔", enabled: true },
  { id: "recipes",  label: "Recipes",  icon: "📖", enabled: true },
  { id: "settings", label: "Settings", icon: "⚙", enabled: true },
];

export const DEFAULT_TAB = "home";
