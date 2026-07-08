// Brews tab — F3 new-brew form (the daily logger), also used for edit (F5).
// Coffee dropdown = db.listBags() default call (finished excluded by contract);
// when editing a brew of a finished bag, that bag is appended as an option.
// Picking a BrewIdea links recipeId and prefills matching fields.

import { useEffect, useMemo, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { db } from "../../lib/db";
import type { Bag, Brew, ID } from "../../lib/types";
import { ratioOf, todayISO, type BrewsData } from "./data";

interface Draft {
  date: string; bagId: string; brewerId: string; grinderId: string; recipeId: string;
  filter: string; roastDate: string; doseG: string; waterG: string; tempC: string;
  totalTime: string; grind: string; pourTechnique: string; notes: string; learnings: string;
}

const num = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : undefined; };
const firstNum = (s?: string) => { const m = s?.match(/(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : undefined; };
const trimmed = (s: string) => s.trim() || undefined;

function Field({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <label class="f-field">
      <span class="f-label">{label}{hint && <span class="f-hint"> · {hint}</span>}</span>
      {children}
    </label>
  );
}

export function BrewForm({ data, existing, onSaved, onCancel }: {
  data: BrewsData;
  existing?: Brew;
  onSaved: (brewId: ID) => void;
  onCancel: () => void;
}) {
  // Coffee dropdown: the contract's default listBags() call (no finished bags).
  const [activeBags, setActiveBags] = useState<Bag[] | null>(null);
  useEffect(() => { db.listBags().then(setActiveBags); }, []);

  const [d, setD] = useState<Draft>(() => ({
    date: existing?.date ?? todayISO(),
    bagId: existing?.bagId ?? "",
    brewerId: existing?.brewerId ?? "",
    grinderId: existing?.grinderId ?? (data.grinders.length === 1 ? data.grinders[0].id : ""),
    recipeId: existing?.recipeId ?? "",
    filter: existing?.filter ?? "",
    roastDate: existing?.roastDate ?? "",
    doseG: existing?.doseG != null ? String(existing.doseG) : "",
    waterG: existing?.waterG != null ? String(existing.waterG) : "",
    tempC: existing?.tempC != null ? String(existing.tempC) : "",
    totalTime: existing?.totalTime ?? "",
    grind: existing?.grind ?? "",
    pourTechnique: existing?.pourTechnique ?? "",
    notes: existing?.notes ?? "",
    learnings: existing?.learnings ?? "",
  }));
  const [saving, setSaving] = useState(false);

  const input = (k: keyof Draft) => (e: Event) => {
    const v = (e.currentTarget as HTMLInputElement).value;
    setD((p) => ({ ...p, [k]: v }));
  };

  const bagOptions = useMemo(() => {
    const opts = [...(activeBags ?? [])];
    if (existing) {
      const cur = data.allBags.find((b) => b.id === existing.bagId);
      if (cur && !opts.some((b) => b.id === cur.id)) opts.push(cur); // finished bag of an old brew stays selectable
    }
    return opts;
  }, [activeBags, existing, data.allBags]);

  /** Bag picked → roastDate auto-fills from the bag. */
  const pickBag = (e: Event) => {
    const id = (e.currentTarget as HTMLSelectElement).value;
    const bag = data.allBags.find((b) => b.id === id);
    setD((p) => ({ ...p, bagId: id, roastDate: bag?.roastDate ?? "" }));
  };

  /** Idea picked → link recipeId + prefill whatever the idea specifies. */
  const pickIdea = (e: Event) => {
    const id = (e.currentTarget as HTMLSelectElement).value;
    setD((p) => {
      if (!id) return { ...p, recipeId: "" };
      const idea = data.ideas.find((i) => i.id === id);
      if (!idea) return { ...p, recipeId: "" };
      const next: Draft = { ...p, recipeId: id };
      const dose = firstNum(idea.dose);
      if (dose != null) next.doseG = String(dose);
      const ratio = idea.ratio?.match(/1\s*:\s*(\d+(?:\.\d+)?)/);
      const doseForWater = dose ?? num(p.doseG);
      if (ratio && doseForWater) next.waterG = String(Math.round(doseForWater * parseFloat(ratio[1])));
      const temp = firstNum(idea.temp);
      if (temp != null) next.tempC = String(temp);
      if (idea.grind) next.grind = idea.grind;
      if (idea.steps) next.pourTechnique = idea.steps;
      if (idea.brewer) {
        const txt = idea.brewer.toLowerCase();
        const match = [...data.brewers]
          .sort((a, b) => b.name.length - a.name.length)
          .find((b) => txt.includes(b.name.toLowerCase()));
        if (match) next.brewerId = match.id;
      }
      return next;
    });
  };

  const liveRatio = ratioOf(num(d.doseG), num(d.waterG));
  // Only the coffee is required — everything else is optional (winging-it friendly).
  const canSave = !!d.bagId && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const brew: Brew = {
      id: existing?.id ?? crypto.randomUUID(),
      date: d.date,
      bagId: d.bagId,
      brewerId: d.brewerId,
      grinderId: d.grinderId || undefined,
      recipeId: d.recipeId || undefined,
      filter: trimmed(d.filter),
      roastDate: d.roastDate || undefined,
      doseG: num(d.doseG),
      waterG: num(d.waterG),
      tempC: num(d.tempC),
      totalTime: trimmed(d.totalTime),
      grind: trimmed(d.grind),
      pourTechnique: trimmed(d.pourTechnique),
      notes: trimmed(d.notes),
      learnings: trimmed(d.learnings),
      withFriends: existing?.withFriends ?? false, // friends land in Phase 6
      friendIds: existing?.friendIds ?? [],
    };
    await db.upsertBrew(brew);
    onSaved(brew.id);
  };

  return (
    <div>
      <button class="btn ghost brew-back" onClick={onCancel}>‹ Cancel</button>

      <div class="glass">
        <div class="f-section">Coffee</div>
        <Field label="Coffee">
          <select class="f-input" value={d.bagId} onChange={pickBag} disabled={!activeBags}>
            <option value="" disabled>{activeBags ? "Pick a bag…" : "Loading…"}</option>
            {bagOptions.map((b) => (
              <option value={b.id}>{b.coffeeName} — {b.roaster}{b.finished ? " (finished)" : ""}</option>
            ))}
          </select>
        </Field>
        <div class="f-row">
          <Field label="Date">
            <input class="f-input" type="date" value={d.date} onInput={input("date")} />
          </Field>
          <Field label="Roast date" hint="auto from bag">
            <input class="f-input" type="date" value={d.roastDate} onInput={input("roastDate")} />
          </Field>
        </div>
        <Field label="Brew idea" hint="optional — prefills the recipe">
          <select class="f-input" value={d.recipeId} onChange={pickIdea}>
            <option value="">None</option>
            {data.ideas.map((i) => <option value={i.id}>{i.name}</option>)}
          </select>
        </Field>
      </div>

      <div class="glass">
        <div class="f-section">Setup</div>
        <div class="f-row">
          <Field label="Brewer">
            <select class="f-input" value={d.brewerId} onChange={input("brewerId")}>
              <option value="">None</option>
              {data.brewers.map((b) => <option value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Grinder">
            <select class="f-input" value={d.grinderId} onChange={input("grinderId")}>
              <option value="">None</option>
              {data.grinders.map((g) => <option value={g.id}>{g.name}</option>)}
            </select>
          </Field>
        </div>
        <div class="f-row">
          <Field label="Grind">
            <input class="f-input" type="text" placeholder="7.5" value={d.grind} onInput={input("grind")} />
          </Field>
          <Field label="Filter">
            <input class="f-input" type="text" placeholder="Brown wavy paper" value={d.filter} onInput={input("filter")} />
          </Field>
        </div>
      </div>

      <div class="glass">
        <div class="f-section">Brew{liveRatio && <span class="chip f-ratio">{liveRatio}</span>}</div>
        <div class="f-row">
          <Field label="Dose (g)">
            <input class="f-input" type="number" inputMode="decimal" step="0.1" min="0" placeholder="17" value={d.doseG} onInput={input("doseG")} />
          </Field>
          <Field label="Water (g)">
            <input class="f-input" type="number" inputMode="decimal" step="1" min="0" placeholder="255" value={d.waterG} onInput={input("waterG")} />
          </Field>
        </div>
        <div class="f-row">
          <Field label="Temp (°C)">
            <input class="f-input" type="number" inputMode="decimal" step="0.5" min="0" max="100" placeholder="92" value={d.tempC} onInput={input("tempC")} />
          </Field>
          <Field label="Total time">
            <input class="f-input" type="text" placeholder="4:16" value={d.totalTime} onInput={input("totalTime")} />
          </Field>
        </div>
      </div>

      <div class="glass">
        <div class="f-section">Recipe</div>
        <Field label="Pour technique">
          <textarea class="f-input pour-input" rows={6} placeholder="60g bloom @0:00, slow spirals toward 150g by 1:15, 250g by 1:45, drawdown by 3:30…" value={d.pourTechnique} onInput={input("pourTechnique")} />
        </Field>
        <Field label="Recipe notes" hint="about the method">
          <textarea class="f-input" rows={3} placeholder="Anything worth remembering about the recipe itself?" value={d.notes} onInput={input("notes")} />
        </Field>
        <Field label="Recipe learnings" hint="what to change next time">
          <textarea class="f-input" rows={3} placeholder="e.g. go coarser, hotter — one lever at a time…" value={d.learnings} onInput={input("learnings")} />
        </Field>
      </div>

      <button class="btn brew-log-btn" disabled={!canSave} onClick={save}>
        {saving ? "Saving…" : existing ? "Save changes" : "Save brew"}
      </button>
    </div>
  );
}
