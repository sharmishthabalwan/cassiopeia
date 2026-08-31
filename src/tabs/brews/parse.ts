// Brews tab — parse a daily brew log (markdown/plain text) into journal fields.
// Heuristic, not AI: these notes are 1–2 cups/day and follow a loose labeled
// format (Coffee / Dose / Water / Pour schedule / tasting scores). Matching
// bags, brewers, and grinders is by name against the local catalog.

import type { Bag, Brewer, Grinder, ID, Scores } from "../../lib/types";
import { RATING_AXES, type AxisKey } from "../../lib/types";

export interface Catalog {
  bags: Bag[];
  brewers: Brewer[];
  grinders: Grinder[];
}

export interface BagMatch {
  id: ID;
  coffeeName: string;
  roaster: string;
  finished?: boolean;
  score: number;
}

export interface ParsedBrew {
  sourceName?: string;
  date?: string;
  coffeeRaw?: string;
  roasterHint?: string;
  coffeeHint?: string;
  bagId?: ID;
  bagConfidence: "high" | "low" | "none";
  bagCandidates: BagMatch[];
  brewerId?: ID;
  brewerRaw?: string;
  grinderId?: ID;
  grinderRaw?: string;
  filter?: string;
  doseG?: number;
  waterG?: number;
  tempC?: number;
  totalTime?: string;
  grind?: string;
  pourTechnique?: string;
  notes?: string;
  learnings?: string;
  scores: Scores;
  tastingNotes: string[];
  cupLearnings?: string;
  warnings: string[];
}

const MONTH: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

const AXIS_ALIASES: Record<string, AxisKey> = {
  flavour: "flavour", flavor: "flavour",
  fragrance: "fragrance", aroma: "fragrance",
  sweetness: "sweetness", sweet: "sweetness",
  balance: "balance",
  aftertaste: "aftertaste", finish: "aftertaste",
  mouthfeel: "mouthfeel",
  body: "body",
  acidity: "acidity", acid: "acidity",
  bitterness: "bitterness", bitter: "bitterness",
};

const DATE_RE = new RegExp(
  String.raw`\b(\d{1,2})[ _./-]?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[ _./-]+(\d{4})(?!\d)`,
  "i",
);
const ISO_DATE_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/;

function stripMd(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/[ \t]+\n/g, "\n");
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[–—]/g, "-").replace(/[^a-z0-9]+/g, " ").trim();
}

function firstNum(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : undefined;
}

function snapHalf(n: number): number {
  const snapped = Math.round(n * 2) / 2;
  return Math.min(5, Math.max(1, snapped));
}

function labeled(text: string, names: string[]): string | undefined {
  const alt = names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${alt})\\s*[:–—-]\\s*(.+)`,
    "i",
  );
  const m = text.match(re);
  const v = m?.[1]?.trim();
  return v || undefined;
}

function section(text: string, heading: RegExp): string | undefined {
  const lines = text.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/[:–—]\s*$/, "").trim();
    if (heading.test(line) && line.length < 80) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return undefined;
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) {
      if (out.length) out.push("");
      continue;
    }
    // Next heading (short title-like line with no colon value, or a known section).
    const isHeading =
      (line.length < 70 && !line.includes(":") && /^(recipe|gear|setup|pour|timeline|schedule|sensory|tasting|pondering|context|overall|ratio|approach|brew parameter)/i.test(line)) ||
      (/^[A-Z][A-Za-z /&]{3,40}$/.test(line) && !/\d/.test(line) && out.length > 0 && lines[i + 1]?.trim().startsWith("-"));
    if (isHeading && out.some((x) => x.trim())) break;
    out.push(raw.replace(/^\s*[-*]\s*/, "").trim());
  }
  const body = out.join("\n").trim();
  return body || undefined;
}

function parseDate(text: string, filename?: string): string | undefined {
  const tryMatch = (s: string): string | undefined => {
    const iso = s.match(ISO_DATE_RE);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const d = s.match(DATE_RE);
    if (!d) return undefined;
    const day = d[1].padStart(2, "0");
    const month = MONTH[d[2].toLowerCase()];
    if (!month) return undefined;
    return `${d[3]}-${month}-${day}`;
  };
  const labeledDate = labeled(text, ["Date & Time", "Date", "Brew date"]);
  return (labeledDate && tryMatch(labeledDate)) || tryMatch(text) || (filename ? tryMatch(filename) : undefined);
}

function splitCoffee(raw: string): { roaster?: string; coffee?: string } {
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (!cleaned || /^unknown\b/i.test(cleaned)) return {};
  const dash = cleaned.split(/\s*[–—]\s*|\s+-\s+/);
  if (dash.length >= 2) {
    const roaster = dash[0].replace(/^bag\s*\/\s*coffee\s*$/i, "").trim();
    const coffee = dash.slice(1).join(" – ").replace(/\s*\(.*$/, "").trim();
    return { roaster: roaster || undefined, coffee: coffee || undefined };
  }
  const beforeParen = cleaned.replace(/\s*\(.*$/, "").trim();
  return { coffee: beforeParen || undefined };
}

function tokenSet(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length >= 3 && t !== "the" && t !== "and" && t !== "estate");
}

function editDist(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function matchBag(coffeeHint: string | undefined, roasterHint: string | undefined, bags: Bag[]): {
  bagId?: ID;
  confidence: ParsedBrew["bagConfidence"];
  candidates: BagMatch[];
} {
  if (!coffeeHint || /^unknown\b/i.test(coffeeHint)) {
    return { confidence: "none", candidates: [] };
  }
  const coffeeN = norm(coffeeHint);
  const roasterN = roasterHint ? norm(roasterHint) : "";
  const coffeeToks = tokenSet(coffeeHint);
  if (!coffeeN) return { confidence: "none", candidates: [] };

  const scored: BagMatch[] = [];
  for (const bag of bags) {
    const nameN = norm(bag.coffeeName);
    const roastN = norm(bag.roaster);
    if (!nameN) continue;
    let score = 0;
    if (nameN === coffeeN) score += 24;
    else if (coffeeN.includes(nameN) || nameN.includes(coffeeN)) score += 16;
    const bagToks = tokenSet(bag.coffeeName);
    const overlap = bagToks.filter((t) => coffeeToks.includes(t) || coffeeToks.some((c) => editDist(c, t) <= 1 && t.length >= 4));
    score += overlap.length * 6;
    if (roasterN && roastN) {
      if (roasterN === roastN || coffeeN.includes(roastN) || roasterN.includes(roastN)) score += 8;
    } else if (roastN && coffeeN.includes(roastN)) {
      score += 6;
    }
    // Tiny names ("Gold") shouldn't steal a match on their own.
    if (score > 0 && nameN.length < 5 && !(coffeeN.includes(nameN))) continue;
    if (score >= 6) {
      scored.push({
        id: bag.id,
        coffeeName: bag.coffeeName,
        roaster: bag.roaster,
        finished: bag.finished,
        score: bag.finished ? score - 2 : score,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.coffeeName.localeCompare(b.coffeeName));
  const top = scored[0];
  const second = scored[1];
  if (!top) return { confidence: "none", candidates: [] };
  const unique = !second || top.score >= second.score + 6;
  const high = unique && top.score >= 16;
  return {
    bagId: high ? top.id : unique && top.score >= 12 ? top.id : undefined,
    confidence: high ? "high" : unique && top.score >= 10 ? "low" : "none",
    candidates: scored.slice(0, 5),
  };
}

function matchNamed<T extends { id: ID; name: string }>(raw: string | undefined, items: T[]): T | undefined {
  if (!raw) return undefined;
  const hay = norm(raw);
  const ranked = items
    .map((item) => {
      const n = norm(item.name);
      if (!n) return { item, score: 0 };
      if (hay === n) return { item, score: 100 + n.length };
      if (hay.includes(n)) return { item, score: 50 + n.length };
      if (n.includes(hay) && hay.length >= 4) return { item, score: 30 + hay.length };
      return { item, score: 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.item;
}

function extractPour(text: string): { pour?: string; totalTime?: string } {
  const body =
    section(text, /pour schedule|brew timeline|timeline|pour schedule & timing/i) ||
    undefined;
  const drawdownLine =
    labeled(text, ["Drawdown", "Drawdown finished at", "Total brew time", "Total time"]) ||
    text.split("\n").find((l) => /drawdown/i.test(l));
  let totalTime: string | undefined;
  const timeSrc = drawdownLine || body || "";
  const tm = timeSrc.match(
    /(?:drawdown|finished|completed|total(?: brew)? time).{0,40}?(\d{1,2}:\d{2})/i,
  ) || timeSrc.match(/\b(\d{1,2}:\d{2})\b/);
  if (tm && /drawdown|finished|completed|total/i.test(timeSrc)) totalTime = tm[1].replace(/^0/, "");
  // Prefer the last mm:ss in a drawdown sentence (avoid bloom 0:00).
  if (drawdownLine) {
    const all = [...drawdownLine.matchAll(/\b(\d{1,2}:\d{2})\b/g)].map((m) => m[1]);
    const last = all.filter((t) => t !== "0:00" && t !== "00:00").pop();
    if (last) totalTime = last.replace(/^0(\d:)/, "$1");
  }
  const pour = body
    ?.split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return { pour, totalTime };
}

function extractScores(text: string): { scores: Scores; invertAcidity: boolean } {
  const scores: Scores = {};
  const tasting =
    section(text, /tasting notes|sensory notes|drinking experience|cup notes/i) || text;
  const invertAcidity = !/acidity[^.\n]{0,80}5\s*=\s*lowest/i.test(tasting);

  const lineRe =
    /(?:^|\n)\s*(flavour|flavor|fragrance|aroma|sweetness|balance|aftertaste|finish|mouthfeel|body|acidity|bitterness)\s*:\s*(.+)/gi;
  let m: RegExpExecArray | null;
  while ((m = lineRe.exec(tasting))) {
    const axis = AXIS_ALIASES[m[1].toLowerCase()];
    if (!axis || scores[axis] != null) continue;
    const val = m[2];
    // Prefer a 4–4.5/5 range over the trailing 4.5/5 single.
    const range = val.match(/(\d+(?:\.\d+)?)\s*[\u2013\u2014-]\s*(\d+(?:\.\d+)?)\s*\/\s*5/);
    const single = val.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
    let n: number | undefined;
    if (range) n = (parseFloat(range[1]) + parseFloat(range[2])) / 2;
    else if (single) n = parseFloat(single[1]);
    if (n == null || n < 1 || n > 5) continue;
    n = snapHalf(n);
    // Notes score acidity as intensity (5 = most acidic); the journal stores
    // the opposite direction (5 = lowest). Invert so the radar matches.
    if (axis === "acidity" && invertAcidity) n = snapHalf(6 - n);
    scores[axis] = n;
  }
  return { scores, invertAcidity };
}

function extractChips(text: string): string[] {
  const tasting = section(text, /tasting notes|sensory notes|drinking experience/i) || "";
  const highlights =
    labeled(tasting, ["Flavor highlights", "Flavour highlights", "Flavor", "Flavour"]) || "";
  const aroma = labeled(tasting, ["Aroma (dry / wet)", "Aroma", "Fragrance"]) || "";
  const smoke = labeled(tasting, ["Smoke", "Smoke / roast character", "Roast character"]) || "";
  const pool = [highlights, aroma, smoke].filter(Boolean).join("; ");
  const chips: string[] = [];
  const add = (raw: string) => {
    const t = raw.replace(/^["“]|["”]$/g, "").replace(/\bvery\s+/gi, "").trim();
    if (t.length < 3 || t.length > 36) return;
    if (/if scored|qualitatively|described as|noted during|not prominent|not specified/i.test(t)) return;
    const key = t.toLowerCase();
    if (chips.some((c) => c.toLowerCase() === key)) return;
    chips.push(t.replace(/\s+/g, " "));
  };
  for (const q of pool.matchAll(/[“"]([^”"]{3,36})[”"]/g)) add(q[1]);
  for (const part of pool.split(/[;.]/)) {
    const clause = part.replace(/\([^)]*\)/g, "").trim();
    if (!clause) continue;
    if (clause.split(/\s+/).length <= 6) add(clause.replace(/^(distinct|a |an |the )/i, ""));
    else {
      for (const bit of clause.split(/,/)) {
        const b = bit.trim();
        if (b.split(/\s+/).length <= 4) add(b.replace(/^(distinct|a |an |the )/i, ""));
      }
    }
  }
  // Bare tasting words that showed up without a highlights line.
  const vocab = ["lime", "tea-like", "tangy", "silky", "smoke", "smoky", "floral", "berry", "citrus", "peach"];
  const hay = norm(tasting);
  for (const w of vocab) {
    if (hay.includes(norm(w))) add(w);
  }
  return chips.slice(0, 8);
}

function extractNotes(text: string): { notes?: string; learnings?: string; cupLearnings?: string } {
  const approach = section(text, /ratio & approach|ratio and approach|approach|method/i);
  const ponder = section(text, /ponderings|context|for weekly|analysis/i);
  const overall = labeled(text, ["Overall impression", "Overall"]);
  const notes = approach
    ?.split("\n")
    .map((l) => l.replace(/^\s*(Target ratio|Method|Hypothesis)\s*[:–—-]\s*/i, "").trim())
    .filter(Boolean)
    .join("\n");
  return {
    notes: notes || undefined,
    learnings: ponder || undefined,
    cupLearnings: overall || undefined,
  };
}

function grindFrom(text: string, grinderRaw?: string, matchedGrinder?: Grinder): string | undefined {
  const setting = labeled(text, ["Grind setting", "Grind", "K-Ultra", "Setting"]);
  const speed = labeled(text, ["Speed", "RPM"]);
  const parts: string[] = [];
  const settingNum = setting && /\d/.test(setting) ? setting.replace(/^~/, "").trim() : undefined;
  // Drop prose-only grind settings ("in the round / intuitive").
  if (setting && settingNum && firstNum(settingNum) != null && !/not (numerically )?specified/i.test(setting)) {
    const n = setting.match(/~?\d+(?:\.\d+)?/);
    if (n) parts.push(n[0].replace(/^~/, ""));
  }
  const rpm = speed?.match(/(\d+)\s*rpm/i)?.[1] ?? (speed && /^\s*~?\d+\s*$/.test(speed) ? speed.trim() : undefined);
  if (rpm) parts.push(`${rpm.replace(/^~/, "")} RPM`);
  if (!matchedGrinder && grinderRaw) {
    const g = grinderRaw.replace(/\s*\(.*$/, "").trim();
    if (g && !/^not specified/i.test(g)) parts.unshift(g);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

export function parseBrewLog(raw: string, catalog: Catalog, sourceName?: string): ParsedBrew {
  const text = stripMd(raw);
  const warnings: string[] = [];
  const date = parseDate(text, sourceName);
  const coffeeLine =
    labeled(text, ["Bag / Coffee", "Coffee", "Bag", "Beans"]) ||
    (sourceName && /sey|prodigal|wilson|alba|dredi|dreyde/i.test(sourceName) ? sourceName.replace(/\.[a-z]+$/i, "").replace(/[_-]+/g, " ") : undefined);
  const { roaster, coffee } = coffeeLine ? splitCoffee(coffeeLine) : {};
  const bag = matchBag(coffee, roaster, catalog.bags);

  const doseLine = labeled(text, ["Dose (g)", "Dose"]);
  const waterLine = labeled(text, ["Water (g) & Temp (°C)", "Water (g) & Temp (C)", "Water & Temp", "Water"]);
  const tempLine = labeled(text, ["Temp (°C)", "Temp (C)", "Temperature", "Temp"]);

  const doseG = firstNum(doseLine);
  let waterG = firstNum(waterLine);
  let tempC = firstNum(tempLine);
  if (waterLine) {
    const atTemp = waterLine.match(/(?:at|@)\s*(\d+(?:\.\d+)?)\s*°?\s*c/i) || waterLine.match(/(\d+(?:\.\d+)?)\s*°\s*c/i);
    if (atTemp && tempC == null) tempC = parseFloat(atTemp[1]);
    // "276 g target at 93°C" — first number is water, not temp.
    const grams = waterLine.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (grams) waterG = parseFloat(grams[1]);
  }

  const brewerRaw = labeled(text, ["Brewer"]);
  const grinderRaw = labeled(text, ["Grinder"]);
  const filter = labeled(text, ["Filter"])?.replace(/^\((not specified).*$/i, "").trim() || undefined;
  const filterClean = filter && !/^not specified/i.test(filter) && !/^\(not specified/i.test(filter) ? filter : undefined;

  const brewer = matchNamed(brewerRaw, catalog.brewers);
  const grinder = matchNamed(grinderRaw, catalog.grinders);
  if (brewerRaw && !brewer) warnings.push(`Brewer “${brewerRaw.replace(/\s*\(.*$/, "").trim()}” isn’t in Settings — left unset.`);
  if (grinderRaw && !grinder) warnings.push(`Grinder “${grinderRaw.replace(/\s*\(.*$/, "").trim()}” isn’t in Settings — recorded on the grind line.`);

  const { pour, totalTime } = extractPour(text);
  const { scores } = extractScores(text);
  const tastingNotes = extractChips(text);
  const { notes, learnings, cupLearnings } = extractNotes(text);
  const grind = grindFrom(text, grinderRaw, grinder);

  if (!bag.bagId) {
    if (coffee && !/^unknown\b/i.test(coffee)) warnings.push(`Couldn’t auto-match “${coffee}” — pick a bag below.`);
    else warnings.push("Coffee isn’t identified in the log — pick a bag below.");
  }

  return {
    sourceName,
    date,
    coffeeRaw: coffeeLine,
    roasterHint: roaster,
    coffeeHint: coffee,
    bagId: bag.bagId,
    bagConfidence: bag.confidence,
    bagCandidates: bag.candidates,
    brewerId: brewer?.id,
    brewerRaw: brewerRaw?.replace(/\s*\(.*$/, "").trim(),
    grinderId: grinder?.id,
    grinderRaw: grinderRaw?.replace(/\s*\(.*$/, "").trim(),
    filter: filterClean,
    doseG,
    waterG,
    tempC,
    totalTime,
    grind,
    pourTechnique: pour,
    notes,
    learnings,
    scores,
    tastingNotes,
    cupLearnings,
    warnings,
  };
}

export function parseHasSignal(p: ParsedBrew): boolean {
  return !!(
    p.date || p.coffeeHint || p.doseG != null || p.waterG != null ||
    p.pourTechnique || Object.keys(p.scores).length || p.tastingNotes.length
  );
}

export function emptyScores(s: Scores): boolean {
  return !(RATING_AXES.some((a) => s[a.key] != null));
}
