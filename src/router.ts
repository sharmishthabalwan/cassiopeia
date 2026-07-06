// Cassiopeia — minimal hash router (Foundation work).
// Maps location.hash -> tab id from nav.config. No external router dependency.
import { TABS, DEFAULT_TAB } from "./nav.config";

export function currentTab(): string {
  const id = location.hash.replace(/^#\/?/, "") || DEFAULT_TAB;
  return TABS.some((t) => t.id === id && t.enabled) ? id : DEFAULT_TAB;
}
export function go(id: string) { location.hash = "/" + id; }
export function onRouteChange(cb: () => void) { addEventListener("hashchange", cb); }
