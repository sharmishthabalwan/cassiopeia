// Material 3 dynamic color from the brand key colors (mauve / olive / sage /
// cream / peach). Light mode pins page surface to white; cream stays on
// surface-container. Per-tab hue only swaps the primary palette; secondary,
// tertiary, and neutrals stay on-brand.

import {
  argbFromHex,
  hexFromArgb,
  Contrast,
  DynamicScheme,
  Hct,
  MaterialDynamicColors,
  TonalPalette,
  Variant,
  type DynamicColor,
} from "@material/material-color-utilities";
import { BRAND, HOME_HUE, type Appearance } from "./types";

/** Default seed per tab (used only for primary when Appearance.hueMode = perTab). */
export const TAB_SEEDS: Record<string, string> = {
  home: BRAND.primary,
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

const palettes = {
  secondary: TonalPalette.fromInt(argbFromHex(BRAND.secondary)),
  tertiary: TonalPalette.fromInt(argbFromHex(BRAND.tertiary)),
  neutral: TonalPalette.fromInt(argbFromHex(BRAND.neutral)),
  neutralVariant: TonalPalette.fromInt(argbFromHex(BRAND.neutralVariant)),
};

function parseHex(hex: string): string | undefined {
  try {
    argbFromHex(hex);
    return hex;
  } catch {
    return undefined;
  }
}

export function seedFor(appearance: Appearance, tabId: string): string {
  if (appearance.hueMode === "uniform") {
    return parseHex(appearance.uniform?.a1 ?? "") ?? HOME_HUE.a1;
  }
  return parseHex(appearance.perTab?.[tabId]?.a1 ?? "") ?? TAB_SEEDS[tabId] ?? HOME_HUE.a1;
}

function contrastingOn(hex: string): string {
  const tone = Hct.fromInt(argbFromHex(hex)).tone;
  return Contrast.ratioOfTones(tone, 100) >= Contrast.ratioOfTones(tone, 10)
    ? "#ffffff"
    : hexFromArgb(palettes.neutral.tone(10));
}

function pinRole(target: HTMLElement, role: string, hex: string) {
  target.style.setProperty(`--md-sys-color-${role}`, hex);
  target.style.setProperty(`--md-sys-color-on-${role}`, contrastingOn(hex));
}

export function applyMd3Scheme(seedHex: string, dark: boolean, target: HTMLElement = document.documentElement) {
  const primaryHex = parseHex(seedHex) ?? BRAND.primary;
  const scheme = new DynamicScheme({
    sourceColorHct: Hct.fromInt(argbFromHex(primaryHex)),
    variant: Variant.TONAL_SPOT,
    contrastLevel: 0,
    isDark: dark,
    specVersion: "2021",
    primaryPalette: TonalPalette.fromInt(argbFromHex(primaryHex)),
    secondaryPalette: palettes.secondary,
    tertiaryPalette: palettes.tertiary,
    neutralPalette: palettes.neutral,
    neutralVariantPalette: palettes.neutralVariant,
  });
  for (const [token, color] of TOKEN_ROLES) {
    target.style.setProperty(`--md-sys-color-${token}`, hexFromArgb(color.getArgb(scheme)));
  }
  // Light mode: keep the brand keys on the roles they were chosen for
  // (MCU would otherwise pick a different tone from each palette).
  // Page background is white; cream remains on the container steps.
  if (!dark) {
    pinRole(target, "primary", primaryHex);
    pinRole(target, "secondary", BRAND.secondary);
    pinRole(target, "tertiary", BRAND.tertiary);
    target.style.setProperty("--md-sys-color-surface-tint", primaryHex);
    target.style.setProperty("--md-sys-color-background", BRAND.background);
    target.style.setProperty("--md-sys-color-surface", BRAND.background);
    target.style.setProperty("--md-sys-color-surface-bright", BRAND.background);
    target.style.setProperty("--md-sys-color-outline-variant", BRAND.neutralVariant);
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
    theme.setAttribute("content", surface || (appearance.mode === "light" ? BRAND.background : "#14120e"));
  }
}
