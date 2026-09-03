// AI parse of a daily brew note → journal fields.
// One call per log. The original note is kept as sourceText (Brew.journalNote).

import { completeJson } from "../../lib/openai";
import { RATING_AXES, type AxisKey, type BrewIdea, type Scores } from "../../lib/types";
import { matchBag, matchNamed, type Catalog, type ParsedBrew } from "./parse";

interface AiFields {
  date?: string | null;
  coffeeName?: string | null;
  roaster?: string | null;
  bagId?: string | null;
  brewerId?: string | null;
  brewerName?: string | null;
  grinderId?: string | null;
  grinderName?: string | null;
  recipeId?: string | null;
  filter?: string | null;
  doseG?: number | null;
  waterG?: number | null;
  tempC?: number | null;
  totalTime?: string | null;
  grind?: string | null;
  pourTechnique?: string | null;
  notes?: string | null;
  learnings?: string | null;
  scores?: Partial<Record<AxisKey, number | null>> | null;
  tastingNotes?: string[] | null;
  cupLearnings?: string | null;
}

const AXIS_KEYS = new Set<string>(RATING_AXES.map((a) => a.key));

const SYSTEM = `You extract a pour-over (or other) coffee brew from a freeform daily note into JSON for a personal journal.

Return ONLY a JSON object with these keys (use null when unknown):
date (YYYY-MM-DD), coffeeName, roaster, bagId, brewerId, brewerName, grinderId, grinderName, recipeId, filter, doseG (number, grams), waterG (number, grams), tempC (number), totalTime (string like "7:28"), grind (setting and RPM if given), pourTechnique (the pour schedule as readable lines), notes (short RECIPE/method notes only — ratio, approach, hypothesis — NOT the full log), learnings (ponderings / what to change next / weekly analysis), scores (object of rating axes to 1–5 in 0.5 steps), tastingNotes (array of short flavour words), cupLearnings (overall tasting impression / cup prose).

Rating axes and DIRECTION — 5 is not always "best":
- flavour, fragrance, sweetness, balance, aftertaste, mouthfeel: 5 = highest/best
- acidity: 5 = LOWEST acidity (same idea as bitterness)
- bitterness: 5 = lowest bitterness
- body: 5 = lightest
If the note gives a numeric /5 score, store that number as-is on this scale. Do not invert. If only qualitative (e.g. "high acidity") with no number, you may infer a 1–5 value on this scale (high acidity → about 2, low acidity → about 4, moderate → 3). Omit axes that are not mentioned.

bagId, brewerId, grinderId, recipeId MUST be copied from the catalog lists in the user message, or null. Prefer an exact catalog id. If the coffee is unknown / unidentified, bagId is null.

pourTechnique should include the bloom and pours with times and weights. notes must stay short. Never dump the whole source note into notes.`;

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t && t.toLowerCase() !== "null" ? t : undefined;
}

function snapHalf(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n * 2) / 2));
}

function asScores(raw: AiFields["scores"]): Scores {
  const out: Scores = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw)) {
    if (!AXIS_KEYS.has(k)) continue;
    const n = num(v);
    if (n == null || n < 1 || n > 5) continue;
    out[k as AxisKey] = snapHalf(n);
  }
  return out;
}

export async function parseBrewLogWithAi(
  raw: string,
  catalog: Catalog,
  opts?: { sourceName?: string; ideas?: BrewIdea[] },
): Promise<ParsedBrew> {
  const bags = catalog.bags.map((b) => ({
    id: b.id, coffeeName: b.coffeeName, roaster: b.roaster, finished: b.finished,
  }));
  const user = [
    opts?.sourceName ? `Filename: ${opts.sourceName}` : "",
    "Catalog bags:",
    JSON.stringify(bags),
    "Catalog brewers:",
    JSON.stringify(catalog.brewers),
    "Catalog grinders:",
    JSON.stringify(catalog.grinders),
    opts?.ideas?.length
      ? `Catalog brew ideas:\n${JSON.stringify(opts.ideas.map((i) => ({ id: i.id, name: i.name })))}`
      : "",
    "--- BREW NOTE ---",
    raw.trim(),
  ].filter(Boolean).join("\n\n");

  const extracted = await completeJson(SYSTEM, user) as AiFields;
  const coffee = str(extracted.coffeeName);
  const roaster = str(extracted.roaster);
  let bagId = str(extracted.bagId);
  if (bagId && !catalog.bags.some((b) => b.id === bagId)) bagId = undefined;
  const fuzzy = matchBag(coffee, roaster, catalog.bags);
  if (!bagId) bagId = fuzzy.bagId;
  const bagConfidence = bagId
    ? (fuzzy.bagId === bagId ? fuzzy.confidence : "high")
    : fuzzy.confidence;

  let brewerId = str(extracted.brewerId);
  if (brewerId && !catalog.brewers.some((b) => b.id === brewerId)) brewerId = undefined;
  if (!brewerId) brewerId = matchNamed(str(extracted.brewerName), catalog.brewers)?.id;

  let grinderId = str(extracted.grinderId);
  if (grinderId && !catalog.grinders.some((g) => g.id === grinderId)) grinderId = undefined;
  if (!grinderId) grinderId = matchNamed(str(extracted.grinderName), catalog.grinders)?.id;

  const warnings: string[] = [];
  if (!bagId) {
    if (coffee && !/^unknown\b/i.test(coffee)) warnings.push(`Couldn’t auto-match “${coffee}” — pick a bag below.`);
    else warnings.push("Coffee isn’t identified in the log — pick a bag below.");
  }
  const grinderName = str(extracted.grinderName);
  if (grinderName && !grinderId) {
    warnings.push(`Grinder “${grinderName}” isn’t in Settings — recorded on the grind line.`);
  }

  let grind = str(extracted.grind);
  if (!grinderId && grinderName && grind && !grind.toLowerCase().includes(grinderName.toLowerCase())) {
    grind = `${grinderName} · ${grind}`;
  } else if (!grinderId && grinderName && !grind) {
    grind = grinderName;
  }

  let date = str(extracted.date);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = undefined;

  let recipeId = str(extracted.recipeId);
  if (recipeId && !opts?.ideas?.some((i) => i.id === recipeId)) recipeId = undefined;

  const tastingNotes = Array.isArray(extracted.tastingNotes)
    ? extracted.tastingNotes.map((n) => String(n).trim()).filter((n) => n.length >= 2 && n.length <= 40).slice(0, 10)
    : [];

  return {
    sourceName: opts?.sourceName,
    date,
    dateSource: date ? "log" : undefined,
    coffeeRaw: [roaster, coffee].filter(Boolean).join(" – ") || coffee,
    roasterHint: roaster,
    coffeeHint: coffee,
    bagId,
    bagConfidence,
    bagCandidates: fuzzy.candidates,
    brewerId,
    brewerRaw: str(extracted.brewerName),
    grinderId,
    grinderRaw: grinderName,
    filter: str(extracted.filter),
    doseG: num(extracted.doseG),
    waterG: num(extracted.waterG),
    tempC: num(extracted.tempC),
    totalTime: str(extracted.totalTime),
    grind,
    pourTechnique: str(extracted.pourTechnique),
    recipeId,
    sourceText: raw.trim() || undefined,
    notes: str(extracted.notes),
    learnings: str(extracted.learnings),
    scores: asScores(extracted.scores),
    tastingNotes,
    cupLearnings: str(extracted.cupLearnings),
    warnings,
    parsedBy: "ai",
  };
}

/** AI values win when present; heuristic fills gaps. Original note always kept. */
export function mergeParsed(heuristic: ParsedBrew, ai: ParsedBrew): ParsedBrew {
  const take = <K extends keyof ParsedBrew>(k: K): ParsedBrew[K] => {
    const v = ai[k];
    if (v == null || v === "") return heuristic[k];
    if (Array.isArray(v) && v.length === 0) return heuristic[k];
    return v;
  };
  const scores = Object.keys(ai.scores).length ? ai.scores : heuristic.scores;
  return {
    ...heuristic,
    date: take("date"),
    dateSource: take("dateSource"),
    coffeeRaw: take("coffeeRaw"),
    roasterHint: take("roasterHint"),
    coffeeHint: take("coffeeHint"),
    bagId: take("bagId"),
    bagConfidence: ai.bagId ? ai.bagConfidence : heuristic.bagConfidence,
    bagCandidates: ai.bagCandidates.length ? ai.bagCandidates : heuristic.bagCandidates,
    brewerId: take("brewerId"),
    brewerRaw: take("brewerRaw"),
    grinderId: take("grinderId"),
    grinderRaw: take("grinderRaw"),
    filter: take("filter"),
    doseG: take("doseG"),
    waterG: take("waterG"),
    tempC: take("tempC"),
    totalTime: take("totalTime"),
    grind: take("grind"),
    pourTechnique: take("pourTechnique"),
    recipeId: take("recipeId"),
    notes: take("notes"),
    learnings: take("learnings"),
    cupLearnings: take("cupLearnings"),
    scores,
    tastingNotes: ai.tastingNotes.length ? ai.tastingNotes : heuristic.tastingNotes,
    sourceText: heuristic.sourceText || ai.sourceText,
    warnings: ai.warnings.length ? ai.warnings : heuristic.warnings,
    parsedBy: "ai",
    sourceName: heuristic.sourceName || ai.sourceName,
  };
}
