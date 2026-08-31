// Brews tab — upload or paste a daily brew log, parse it into a journal row.
// The form stays available as an explicit choice from this screen (and vice versa).

import { useMemo, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { db } from "../../lib/db";
import { RATING_AXES, type Bag, type Brew, type ID, type Rating } from "../../lib/types";
import { ratioOf, todayISO, type BrewsData } from "./data";
import { emptyScores, parseBrewLog, parseHasSignal, type ParsedBrew } from "./parse";

function Field({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <label class="f-field">
      <span class="f-label">{label}{hint && <span class="f-hint"> · {hint}</span>}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <div class="stat">
      <div class="stat-v">{value}</div>
      <div class="stat-k">{label}</div>
    </div>
  );
}

const ACCEPT = ".md,.txt,.markdown,text/plain,text/markdown";

async function readDropped(list: FileList | File[]): Promise<{ name: string; text: string }[]> {
  const out: { name: string; text: string }[] = [];
  for (const f of [...list]) {
    if (f.size > 400_000) throw new Error(`“${f.name}” is too large to parse.`);
    out.push({ name: f.name, text: await f.text() });
  }
  return out;
}

export function BrewLogImport({ data, onCancel, onSaved, onUseForm }: {
  data: BrewsData;
  onCancel: () => void;
  onSaved: (brewId: ID, info: { count: number; rated: boolean }) => void;
  onUseForm: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<ParsedBrew[] | null>(null);
  const [saving, setSaving] = useState(false);

  const catalog = useMemo(
    () => ({ bags: data.allBags, brewers: data.brewers, grinders: data.grinders }),
    [data.allBags, data.brewers, data.grinders],
  );

  const activeBags = useMemo(
    () => data.allBags.filter((b) => !b.finished),
    [data.allBags],
  );

  const parseSources = (sources: { name?: string; text: string }[]) => {
    const parsed = sources
      .map((s) => parseBrewLog(s.text, catalog, s.name))
      .filter(parseHasSignal);
    if (!parsed.length) {
      setDrafts(null);
      setError("Couldn’t read a brew from that. Check it’s a daily log, or fill the form instead.");
      return;
    }
    setError(null);
    setDrafts(parsed.map((p) => ({ ...p, date: p.date || todayISO() })));
  };

  const onFiles = async (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    try {
      parseSources(await readDropped(list));
    } catch (e) {
      setDrafts(null);
      setError(e instanceof Error ? e.message : "Couldn’t read that file.");
    }
  };

  const onPasteParse = () => {
    if (!paste.trim()) {
      setError("Paste a brew log, or upload a file.");
      return;
    }
    parseSources([{ name: "pasted notes", text: paste }]);
  };

  const patch = (i: number, fields: Partial<ParsedBrew>) => {
    setDrafts((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[i] = { ...next[i], ...fields };
      return next;
    });
  };

  const bagOptionsFor = (p: ParsedBrew): Bag[] => {
    const opts = [...activeBags];
    const add = (id?: string) => {
      if (!id) return;
      const bag = data.allBags.find((b) => b.id === id);
      if (bag && !opts.some((b) => b.id === bag.id)) opts.push(bag);
    };
    add(p.bagId);
    for (const c of p.bagCandidates) add(c.id);
    return opts;
  };

  const missingBag = !!drafts?.some((d) => !d.bagId);
  const self = data.people.find((p) => p.isSelf) ?? data.people[0];

  const save = async () => {
    if (!drafts?.length || missingBag || saving) return;
    setSaving(true);
    let lastId: ID = "";
    let rated = false;
    try {
      for (const d of drafts) {
        const bag = data.allBags.find((b) => b.id === d.bagId);
        const brew: Brew = {
          id: crypto.randomUUID(),
          date: d.date || todayISO(),
          bagId: d.bagId!,
          brewerId: d.brewerId ?? "",
          grinderId: d.grinderId,
          filter: d.filter,
          roastDate: bag?.roastDate,
          doseG: d.doseG,
          waterG: d.waterG,
          tempC: d.tempC,
          totalTime: d.totalTime,
          grind: d.grind,
          pourTechnique: d.pourTechnique,
          notes: d.sourceText || d.notes,
          learnings: d.learnings,
          withFriends: false,
          friendIds: [],
        };
        await db.upsertBrew(brew);
        lastId = brew.id;
        const hasCup = !emptyScores(d.scores) || d.tastingNotes.length > 0 || !!d.cupLearnings;
        if (hasCup && self) {
          const rating: Rating = {
            id: crypto.randomUUID(),
            brewId: brew.id,
            personId: self.id,
            scores: d.scores,
            tastingNotes: d.tastingNotes.length ? d.tastingNotes : undefined,
            learnings: d.cupLearnings,
          };
          await db.upsertRating(rating);
          rated = true;
        }
      }
      onSaved(lastId, { count: drafts.length, rated });
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  return (
    <div>
      <button class="btn ghost brew-back" onClick={onCancel}>‹ Cancel</button>

      {!drafts && (
        <>
          <div class="glass">
            <div class="f-section">New brew</div>
            <input
              ref={fileRef}
              class="log-file-input"
              type="file"
              accept={ACCEPT}
              multiple
              onChange={(e) => onFiles((e.currentTarget as HTMLInputElement).files)}
            />
            <button
              type="button"
              class={`log-drop${over ? " over" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragEnter={(e) => { e.preventDefault(); setOver(true); }}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                onFiles(e.dataTransfer?.files ?? null);
              }}
            >
              <div class="log-drop-title">Upload a brew log</div>
              <div class="sub">Drop a .md or .txt file here, or tap to choose. Several days at once is fine.</div>
            </button>

            <div class="log-or">or paste</div>
            <textarea
              class="f-input pour-input"
              rows={8}
              placeholder="Paste today’s brew notes — coffee, dose, pours, tasting scores…"
              value={paste}
              onInput={(e) => setPaste((e.currentTarget as HTMLTextAreaElement).value)}
            />
            <button class="btn brew-log-btn" style="margin-top:12px;margin-bottom:0" onClick={onPasteParse} disabled={!paste.trim()}>
              Log this brew
            </button>
          </div>

          <div class="log-switch-row">
            <button type="button" class="log-switch" onClick={onUseForm}>
              ✎ or fill the form
            </button>
          </div>
        </>
      )}

      {error && <div class="glass log-error">{error}</div>}

      {drafts && (
        <>
          {drafts.map((p, i) => (
            <div class="glass" key={p.sourceName ?? i}>
              <div class="f-section">
                {drafts.length > 1 ? `Brew ${i + 1}` : "Ready to log"}
                {p.sourceName && <span class="f-hint"> · {p.sourceName}</span>}
              </div>
              <Field label="Coffee" hint={p.bagConfidence === "high" ? "matched from the log" : "pick a bag"}>
                <select
                  class="f-input"
                  value={p.bagId ?? ""}
                  onChange={(e) => {
                    const bagId = (e.currentTarget as HTMLSelectElement).value;
                    patch(i, { bagId, bagConfidence: bagId ? "high" : "none" });
                  }}
                >
                  <option value="" disabled>Pick a bag…</option>
                  {bagOptionsFor(p).map((b) => (
                    <option value={b.id}>{b.coffeeName} — {b.roaster}{b.finished ? " (finished)" : ""}</option>
                  ))}
                </select>
              </Field>
              {p.coffeeRaw && !p.bagId && <div class="log-warn">Log said: {p.coffeeRaw}</div>}
              <Field
                label="Date"
                hint={!p.dateSource ? "no date in the notes — change if this isn’t today" : undefined}
              >
                <input
                  class="f-input"
                  type="date"
                  value={p.date ?? ""}
                  onInput={(e) => patch(i, { date: (e.currentTarget as HTMLInputElement).value, dateSource: "log" })}
                />
              </Field>
              <div class="stat-grid">
                <Stat label="dose" value={p.doseG != null ? `${p.doseG}g` : undefined} />
                <Stat label="water" value={p.waterG != null ? `${p.waterG}g` : undefined} />
                <Stat label="ratio" value={ratioOf(p.doseG, p.waterG)} />
                <Stat label="temp" value={p.tempC != null ? `${p.tempC}°C` : undefined} />
                <Stat label="time" value={p.totalTime} />
              </div>
              {p.grind && (
                <div class="brew-kv">
                  <div class="brew-kv-k">Grind</div>
                  <div class="brew-kv-v">{p.grind}</div>
                </div>
              )}
              {p.pourTechnique && (
                <div class="brew-kv">
                  <div class="brew-kv-k">Pour</div>
                  <div class="brew-kv-v">{p.pourTechnique}</div>
                </div>
              )}
              {!emptyScores(p.scores) && (
                <div class="brew-kv">
                  <div class="brew-kv-k">Cup scores</div>
                  <div class="note-chips" style="margin-bottom:0">
                    {RATING_AXES.filter((a) => p.scores[a.key] != null).map((a) => (
                      <span class="chip note-chip">{a.label} {p.scores[a.key]} · {a.dir}</span>
                    ))}
                  </div>
                </div>
              )}
              {p.tastingNotes.length > 0 && (
                <div class="note-chips" style="margin-top:10px">
                  {p.tastingNotes.map((n) => <span class="chip note-chip">{n}</span>)}
                </div>
              )}
              {p.sourceText && (
                <div class="brew-kv">
                  <div class="brew-kv-k">Brew note — saved in full</div>
                  <div class="brew-kv-v log-source">{p.sourceText}</div>
                </div>
              )}
              {p.warnings.map((w) => <div class="log-warn">{w}</div>)}
            </div>
          ))}

          <button class="btn brew-log-btn" disabled={missingBag || saving} onClick={save}>
            {saving ? "Saving…" : drafts.length > 1 ? `Log ${drafts.length} brews` : "Log this brew"}
          </button>
          <div class="log-switch-row">
            <button type="button" class="log-switch" onClick={() => { setDrafts(null); setError(null); }}>
              Choose a different log
            </button>
            <button type="button" class="log-switch" onClick={onUseForm}>
              ✎ or fill the form
            </button>
          </div>
        </>
      )}
    </div>
  );
}
