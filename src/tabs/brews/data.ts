// Brews tab — shared data hook + tiny helpers. All data via lib/db only.

import { useCallback, useEffect, useState } from "preact/hooks";
import { db } from "../../lib/db";
import type { Bag, Brew, BrewIdea, Brewer, Grinder, ID, Person } from "../../lib/types";

export interface BrewsData {
  brews: Brew[];
  /** ALL bags (finished included) — needed to resolve names on old brews. */
  allBags: Bag[];
  brewers: Brewer[];
  grinders: Grinder[];
  people: Person[];
  ideas: BrewIdea[];
}

export function useBrewsData(): { data: BrewsData | null; refresh: () => Promise<void> } {
  const [data, setData] = useState<BrewsData | null>(null);
  const refresh = useCallback(async () => {
    const [brews, allBags, brewers, grinders, people, ideas] = await Promise.all([
      db.listBrews(), // already sorted newest-first
      db.listBags({ includeFinished: true }),
      db.listBrewers(),
      db.listGrinders(),
      db.listPeople(),
      db.listIdeas(),
    ]);
    setData({ brews, allBags, brewers, grinders, people, ideas });
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { data, refresh };
}

export function findBag(bags: Bag[], id: ID): Bag | undefined {
  return bags.find((b) => b.id === id);
}

export function bagLabel(bags: Bag[], id: ID): string {
  return findBag(bags, id)?.coffeeName ?? "Unknown coffee";
}

export function brewerLabel(brewers: Brewer[], id: ID): string {
  return brewers.find((b) => b.id === id)?.name ?? "?";
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

/** "1:16.2" (trimmed) from dose+water, or undefined. */
export function ratioOf(doseG?: number, waterG?: number): string | undefined {
  if (!doseG || !waterG || doseG <= 0) return undefined;
  const r = waterG / doseG;
  return `1:${(Math.round(r * 10) / 10).toFixed(1).replace(/\.0$/, "")}`;
}
