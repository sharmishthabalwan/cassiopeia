// Cassiopeia — minimal hash router (Foundation work).
// Maps location.hash -> tab id from nav.config. No external router dependency.
// Hash may include a subpath after the tab id, e.g. `#/brews/<id>/view`.
import { TABS, DEFAULT_TAB } from "./nav.config";

/** Segments of location.hash after `#/`. Empty hash → []. */
export function hashParts(): string[] {
  return location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
}

export function currentTab(): string {
  const id = hashParts()[0] || DEFAULT_TAB;
  return TABS.some((t) => t.id === id && t.enabled) ? id : DEFAULT_TAB;
}
export function go(id: string) { location.hash = "/" + id.replace(/^\//, ""); }
export function onRouteChange(cb: () => void) { addEventListener("hashchange", cb); }
