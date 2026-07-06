// Cassiopeia — first-run import (Foundation).
// Seeds the local DB from /public/seed-data.json, which is emitted ahead of
// time by scripts/convert_seed.py from the user's existing files:
//   ../Coffee Bags.xlsx  (Bags + Brewers — col C font colour = legend colour)
//   ../Brew Ideas.xlsx   (canonical Recipe shape)
//   ../My Coffee Brews.csv (brews + self ratings)
// plus seed/*.json. The xlsx/csv parsing stays out of the client bundle.
//
// Idempotent: seeds only when the store is empty (fresh install / cleared DB).

import { _internal } from "./db";
import type { Bag, Brew, Rating, Person, BrewIdea, GlobalRecipe, Brewer, Grinder } from "./types";

interface SeedData {
  bags: Bag[]; brews: Brew[]; ratings: Rating[]; ideas: BrewIdea[];
  recipes: GlobalRecipe[]; brewers: Brewer[]; grinders: Grinder[]; people: Person[];
}

export async function seedFromFiles(): Promise<void> {
  if (!(await _internal.isEmpty())) return;

  const res = await fetch(`${import.meta.env.BASE_URL}seed-data.json`);
  if (!res.ok) throw new Error(`seed-data.json fetch failed: ${res.status}`);
  const data: SeedData = await res.json();

  await Promise.all([
    _internal.putCollection("bags", data.bags ?? []),
    _internal.putCollection("brews", data.brews ?? []),
    _internal.putCollection("ratings", data.ratings ?? []),
    _internal.putCollection("ideas", data.ideas ?? []),
    _internal.putCollection("recipes", data.recipes ?? []),
    _internal.putCollection("brewers", data.brewers ?? []),
    _internal.putCollection("grinders", data.grinders ?? []),
    _internal.putCollection("people", data.people ?? []),
  ]);
}
