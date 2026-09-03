// Bags tab — shared data hook + helpers. All data via lib/db only.

import { useCallback, useEffect, useState } from "preact/hooks";
import { db } from "../../lib/db";
import type { Bag } from "../../lib/types";

export interface BagsData {
  bags: Bag[];
}

export function useBagsData(): { data: BagsData | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<BagsData | null>(null);
  const refresh = useCallback(async () => {
    const bags = await db.listBags({ includeFinished: true });
    setData({ bags: sortBags(bags) });
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, refresh };
}

/** Active bags first, then frozen, then finished; newest roast date within a group. */
export function sortBags(bags: Bag[]): Bag[] {
  const rank = (b: Bag) => (b.finished ? 2 : b.frozen ? 1 : 0);
  return [...bags].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const da = a.roastDate ?? "";
    const db_ = b.roastDate ?? "";
    if (da !== db_) return da < db_ ? 1 : -1;
    return (a.sr ?? 0) - (b.sr ?? 0);
  });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-05-19" → "19 May" (year appended only if not the current year). */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const short = `${d} ${MONTHS[m - 1]}`;
  return y === new Date().getFullYear() ? short : `${short} ${y}`;
}

/** Today as ISODate in local time. */
export function todayISO(): string {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export function daysSinceRoast(roastDate?: string, asOf = new Date()): number | undefined {
  if (!roastDate) return undefined;
  const [y, m, d] = roastDate.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const roast = new Date(y, m - 1, d);
  const today = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return Math.round((today.getTime() - roast.getTime()) / 86_400_000);
}

export type PeakPhase = "resting" | "peak" | "past";

export interface PeakInfo {
  days: number;
  phase: PeakPhase;
  label: string;
}

/** Filter-coffee peak window: rest 0–6 days, peak 7–21, then past peak. */
export function peakInfo(roastDate?: string, asOf = new Date()): PeakInfo | undefined {
  const days = daysSinceRoast(roastDate, asOf);
  if (days == null) return undefined;
  if (days < 0) return { days, phase: "resting", label: "Roasts in the future" };
  if (days < 7) return { days, phase: "resting", label: `Resting · day ${days}` };
  if (days <= 21) return { days, phase: "peak", label: `Peak · day ${days}` };
  return { days, phase: "past", label: `Past peak · day ${days}` };
}

/** Seed filenames live at /photos/<file>; data URLs / remote URLs pass through. */
export function photoSrc(photo?: string): string | undefined {
  if (!photo) return undefined;
  if (
    photo.startsWith("data:") ||
    photo.startsWith("blob:") ||
    photo.startsWith("http://") ||
    photo.startsWith("https://") ||
    photo.startsWith("/")
  ) {
    return photo;
  }
  const base = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base}photos/${photo}`;
}

export function nextSr(bags: Bag[]): number {
  return bags.reduce((m, b) => Math.max(m, b.sr ?? 0), 0) + 1;
}

export const DEFAULT_BAG_COLOR = "#A3A63A";
