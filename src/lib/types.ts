// Cassiopeia — data model (CONTRACT-OWNED). All tabs & db.ts speak these shapes.
// Rating axes keep their DIRECTION — 5 is not always "best":
//   sweetness/flavour/fragrance/balance/aftertaste/mouthfeel: 5 = highest/best
//   acidity: 5 = lowest · bitterness: 5 = lowest · body: 5 = lightest
// UI must label each slider with its direction.

export type ID = string;
export type ISODate = string; // "YYYY-MM-DD"

export interface Bag {
  id: ID;
  sr?: number;
  roaster: string;
  coffeeName: string;
  roastDate?: ISODate;
  processing?: string;
  varietal?: string;
  notes?: string;
  origin?: string;
  originCountry?: string;
  altitude?: string;
  season?: string;
  type?: string;              // e.g. "Single origin"
  scaCupScore?: number;
  selection?: string;
  roast?: string;             // roast level
  roasterLocation?: string;
  roasterCountry?: string;
  photo?: string;             // storage key / filename
  color?: string;             // per-coffee legend colour (hex)
  // state toggles
  finished: boolean;          // hidden from Brews coffee dropdown when true
  frozen: boolean;
  frozenAmount?: string;      // e.g. "2 serves"
  freezeDate?: ISODate;
}

export const RATING_AXES = [
  { key: "flavour",    label: "Flavour",    dir: "5 = highest" },
  { key: "fragrance",  label: "Fragrance",  dir: "5 = highest" },
  { key: "sweetness",  label: "Sweetness",  dir: "5 = highest" },
  { key: "balance",    label: "Balance",    dir: "5 = highest" },
  { key: "aftertaste", label: "Aftertaste", dir: "5 = highest" },
  { key: "mouthfeel",  label: "Mouthfeel",  dir: "5 = highest" },
  { key: "body",       label: "Body",       dir: "5 = lightest" },
  { key: "acidity",    label: "Acidity",    dir: "5 = lowest" },
  { key: "bitterness", label: "Bitterness", dir: "5 = lowest" },
] as const;
export type AxisKey = (typeof RATING_AXES)[number]["key"];
export type Scores = Partial<Record<AxisKey, number>>; // each 1..5

export interface Person { id: ID; name: string; color: string; isSelf?: boolean; }

export interface Rating {
  id: ID;
  brewId: ID;
  personId: ID;               // Person.id — self or a friend
  scores: Scores;
  tastingNotes?: string[];    // free-text words
}

export interface Brew {
  id: ID;
  date: ISODate;
  bagId: ID;
  brewerId: ID;
  grinderId?: ID;
  recipeId?: ID;              // link to a BrewIdea used
  filter?: string;
  roastDate?: ISODate;        // auto-filled from bag
  doseG?: number;
  waterG?: number;
  tempC?: number;
  totalTime?: string;         // "4:16"
  grind?: string;
  pourTechnique?: string;
  notes?: string;
  learnings?: string;
  withFriends: boolean;
  friendIds: ID[];            // Person ids present at this brew
  // ratings live in Rating[] keyed by brewId (self + each friend)
}

// Canonical Recipe shape — shared by BrewIdea and GlobalRecipe so
// "internet recipe → brew idea → brew" is a row-copy, not a transform.
export interface Recipe {
  brewer?: string;
  dose?: string;
  ratio?: string;            // "1:16"
  grind?: string;            // adapted to K-Ultra
  temp?: string;             // "90°C"
  steps?: string;            // pour structure / method
  targetTime?: string;
  source?: string;
  sourceConfidence?: "low" | "medium" | "high";
  author?: string;          // coffee pro / roaster
  bestFor?: string;
}

export interface BrewIdea extends Recipe {
  id: ID;
  name: string;
  color?: string;           // per-coffee legend colour
  tried?: boolean;
  result?: string;          // filled after brewing
}

export interface GlobalRecipe extends Recipe {
  id: ID;
  name: string;
  why?: string;
  // catalog facets used as filters:
  proId?: string;           // coffee pro
  roasterId?: string;
  style?: string;           // brew style
}

export interface Brewer { id: ID; name: string; }
export interface Grinder { id: ID; name: string; }

// Appearance settings (persisted locally)
export interface Appearance {
  mode: "dark" | "light";
  hueMode: "uniform" | "perTab";
  uniform?: { a1: string; a2: string };
  perTab?: Record<string, { a1: string; a2: string }>;
}
