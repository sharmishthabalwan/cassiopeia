// Contrast helpers for the light-mode pass.
// Flags colours that fall below WCAG AA against the surface they sit on.
// Temporary: remove once the updated primary/secondary palette lands.

const LIGHT_SURFACE = "#FFFFFF";
const AA_NORMAL = 4.5;

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  }
  if (h.length === 6 && /^[0-9a-fA-F]+$/.test(h)) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return null;
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const toLin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

export function contrastRatio(fg: string, bg: string): number {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  if (!a || !b) return 21;
  const L1 = relLuminance(a);
  const L2 = relLuminance(b);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

export function failsOnLight(color?: string): boolean {
  return !!color && contrastRatio(color, LIGHT_SURFACE) < AA_NORMAL;
}

/** className fragment: adds `contrast-flag` when the colour fails on paper. */
export function contrastFlagClass(color?: string): string {
  return failsOnLight(color) ? " contrast-flag" : "";
}
