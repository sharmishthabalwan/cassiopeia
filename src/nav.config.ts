// Sam Caffeinated — navigation registry (CONTRACT-OWNED).
// The bottom nav bar, navigation rail, and the router all read this.
// `symbol` is a Material Symbols Outlined ligature. `icon` is a colour emoji
// kept as a text fallback. Order here = order in the bar / rail.

export interface TabDef {
  id: string;        // also the route and the theme seed key
  label: string;
  icon: string;
  symbol: string;
  enabled: boolean;  // feature flag
}

export const TABS: TabDef[] = [
  { id: "home",     label: "Home",     icon: "🏠", symbol: "home",           enabled: true },
  { id: "brews",    label: "Brews",    icon: "☕", symbol: "coffee",         enabled: true },
  { id: "bags",     label: "Bags",     icon: "🛍️", symbol: "shopping_bag",   enabled: true },
  { id: "ideas",    label: "Ideas",    icon: "💡", symbol: "lightbulb",      enabled: true },
  { id: "insights", label: "Insights", icon: "📊", symbol: "insights",       enabled: true },
  { id: "recipes",  label: "Recipes",  icon: "📖", symbol: "menu_book",      enabled: true },
  { id: "settings", label: "Settings", icon: "⚙️", symbol: "settings",       enabled: true },
];

export const DEFAULT_TAB = "home";
