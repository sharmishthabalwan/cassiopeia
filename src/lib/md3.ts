// Material 3 dynamic color — seed palettes from the brand / per-tab hues.
// Tokens are applied as --md-sys-color-* on <html> (Material Web theming).

import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
  type DynamicColor,
} from "@material/material-color-utilities";
import { HOME_HUE, type Appearance } from "./types";

/** Default seed per tab (matches the previous aurora hue pairs' --a1). */
export const TAB_SEEDS: Record<string, string> = {
  home: HOME_HUE.a1,
  brews: "#A66E4F",
  bags: "#A3A63A",
  ideas: "#C05C90",
  insights: "#7E97B0",
  recipes: "#C4A03C",
  settings: "#A29486",
};

const TOKEN_ROLES: Array<[string, DynamicColor]> = [
  ["primary", MaterialDynamicColors.primary],
  ["on-primary", MaterialDynamicColors.onPrimary],
  ["primary-container", MaterialDynamicColors.primaryContainer],
  ["on-primary-container", MaterialDynamicColors.onPrimaryContainer],
  ["secondary", MaterialDynamicColors.secondary],
  ["on-secondary", MaterialDynamicColors.onSecondary],
  ["secondary-container", MaterialDynamicColors.secondaryContainer],
  ["on-secondary-container", MaterialDynamicColors.onSecondaryContainer],
  ["tertiary", MaterialDynamicColors.tertiary],
  ["on-tertiary", MaterialDynamicColors.onTertiary],
  ["tertiary-container", MaterialDynamicColors.tertiaryContainer],
  ["on-tertiary-container", MaterialDynamicColors.onTertiaryContainer],
  ["error", MaterialDynamicColors.error],
  ["on-error", MaterialDynamicColors.onError],
  ["error-container", MaterialDynamicColors.errorContainer],
  ["on-error-container", MaterialDynamicColors.onErrorContainer],
  ["background", MaterialDynamicColors.background],
  ["on-background", MaterialDynamicColors.onBackground],
  ["surface", MaterialDynamicColors.surface],
  ["on-surface", MaterialDynamicColors.onSurface],
  ["surface-variant", MaterialDynamicColors.surfaceVariant],
  ["on-surface-variant", MaterialDynamicColors.onSurfaceVariant],
  ["outline", MaterialDynamicColors.outline],
  ["outline-variant", MaterialDynamicColors.outlineVariant],
  ["shadow", MaterialDynamicColors.shadow],
  ["scrim", MaterialDynamicColors.scrim],
  ["surface-tint", MaterialDynamicColors.surfaceTint],
  ["inverse-surface", MaterialDynamicColors.inverseSurface],
  ["inverse-on-surface", MaterialDynamicColors.inverseOnSurface],
  ["inverse-primary", MaterialDynamicColors.inversePrimary],
  ["surface-dim", MaterialDynamicColors.surfaceDim],
  ["surface-bright", MaterialDynamicColors.surfaceBright],
  ["surface-container-lowest", MaterialDynamicColors.surfaceContainerLowest],
  ["surface-container-low", MaterialDynamicColors.surfaceContainerLow],
  ["surface-container", MaterialDynamicColors.surfaceContainer],
  ["surface-container-high", MaterialDynamicColors.surfaceContainerHigh],
  ["surface-container-highest", MaterialDynamicColors.surfaceContainerHighest],
];

export function seedFor(appearance: Appearance, tabId: string): string {
  if (appearance.hueMode === "uniform") {
    return appearance.uniform?.a1 ?? HOME_HUE.a1;
  }
  return appearance.perTab?.[tabId]?.a1 ?? TAB_SEEDS[tabId] ?? HOME_HUE.a1;
}

export function applyMd3Scheme(seedHex: string, dark: boolean, target: HTMLElement = document.documentElement) {
  let argb: number;
  try {
    argb = argbFromHex(seedHex);
  } catch {
    argb = argbFromHex(HOME_HUE.a1);
  }
  const scheme = new SchemeTonalSpot(Hct.fromInt(argb), dark, 0);
  for (const [token, color] of TOKEN_ROLES) {
    target.style.setProperty(`--md-sys-color-${token}`, hexFromArgb(color.getArgb(scheme)));
  }
}

export function applyMd3Theme(appearance: Appearance, tabId: string) {
  const html = document.documentElement;
  html.dataset.mode = appearance.mode;
  html.style.colorScheme = appearance.mode;
  html.classList.toggle("uniform-hue", appearance.hueMode === "uniform");
  applyMd3Scheme(seedFor(appearance, tabId), appearance.mode === "dark", html);

  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) {
    const surface = getComputedStyle(html).getPropertyValue("--md-sys-color-surface").trim();
    theme.setAttribute("content", surface || (appearance.mode === "light" ? "#FFFBFF" : "#141218"));
  }
}
