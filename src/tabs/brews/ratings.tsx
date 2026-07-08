// Brews tab — F4 rate a brew: 9 sliders in RATING_AXES order, EACH labeled
// with its direction (axis.dir — 5 is not always "best"), step 0.5, 1..5;
// tasting-note chips; live Radar preview; saves the SELF person's Rating.
// Scores are stored AS-IS — no inversion anywhere.

import { useEffect, useMemo, useState } from "preact/hooks";
import { db } from "../../lib/db";
import { Radar } from "../../lib/radar";
import { RATING_AXES, type ID, type Rating, type Scores } from "../../lib/types";
import { bagLabel, fmtDate, type BrewsData } from "./data";

const DEFAULT_SCORE = 3;

export function RateBrew({ data, brewId, onDone, onCancel }: {
  data: BrewsData;
  brewId: ID;
  onDone: () => void;
  onCancel: () => void;
}) {
  const self = data.people.find((p) => p.isSelf) ?? data.people[0];
  const brew = data.brews.find((b) => b.id === brewId);

  const [existing, setExisting] = useState<Rating | null | undefined>(undefined); // undefined = loading
  const [scores, setScores] = useState<Scores | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const ratings = await db.ratingsForBrew(brewId);
      if (!live) return;
      const mine = self ? ratings.find((r) => r.personId === self.id) : undefined;
      setExisting(mine ?? null);
      const init: Scores = {};
      for (const a of RATING_AXES) init[a.key] = mine?.scores[a.key] ?? DEFAULT_SCORE;
      setScores(init);
      setNotes(mine?.tastingNotes ?? []);
    })();
    return () => { live = false; };
  }, [brewId, self?.id]);

  const series = useMemo(
    () => (scores && self ? [{ name: self.name, color: self.color, scores }] : []),
    [scores, self],
  );

  if (!self) {
    return (
      <div>
        <button class="btn ghost brew-back" onClick={onCancel}>‹ Back</button>
        <div class="glass"><div class="sub">No people configured yet — add yourself in Settings first.</div></div>
      </div>
    );
  }
  if (!scores || existing === undefined) return <div class="sub">Loading…</div>;

  const addNote = (raw: string) => {
    const words = raw.split(",").map((w) => w.trim()).filter(Boolean);
    setNoteInput("");
    if (!words.length) return;
    setNotes((n) => [...n, ...words.filter((w) => !n.includes(w))]);
  };

  const save = async () => {
    setSaving(true);
    const rating: Rating = {
      id: existing?.id ?? crypto.randomUUID(),
      brewId,
      personId: self.id,
      scores, // stored as-is: reversed axes stay reversed
      tastingNotes: notes.length ? notes : undefined,
    };
    await db.upsertRating(rating);
    onDone();
  };

  return (
    <div>
      <button class="btn ghost brew-back" onClick={onCancel}>‹ Back</button>

      <div class="glass">
        <div class="f-section">
          Rate — {brew ? `${bagLabel(data.allBags, brew.bagId)} · ${fmtDate(brew.date)}` : "brew"}
        </div>
        {RATING_AXES.map((axis) => (
          <div class="rate-row" key={axis.key}>
            <div class="rate-head">
              <span class="rate-label">{axis.label}</span>
              <span class="rate-dir">{axis.dir}</span>
              <span class="rate-val">{(scores[axis.key] ?? DEFAULT_SCORE).toFixed(1)}</span>
            </div>
            <input
              class="rate-slider"
              type="range"
              min={1}
              max={5}
              step={0.5}
              value={scores[axis.key] ?? DEFAULT_SCORE}
              aria-label={`${axis.label} (${axis.dir})`}
              onInput={(e) => {
                const v = parseFloat((e.currentTarget as HTMLInputElement).value);
                setScores((s) => ({ ...s, [axis.key]: v }));
              }}
            />
          </div>
        ))}
      </div>

      <div class="glass">
        <div class="f-section">Tasting notes</div>
        {notes.length > 0 && (
          <div class="note-chips">
            {notes.map((w) => (
              <button
                key={w}
                class="chip note-chip"
                aria-label={`Remove ${w}`}
                onClick={() => setNotes((n) => n.filter((x) => x !== w))}
              >
                {w} <span aria-hidden="true">×</span>
              </button>
            ))}
          </div>
        )}
        <input
          class="f-input"
          type="text"
          placeholder="fig, strawberry, creamy — comma or enter adds"
          value={noteInput}
          onInput={(e) => {
            const v = (e.currentTarget as HTMLInputElement).value;
            if (v.includes(",")) addNote(v); else setNoteInput(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addNote(noteInput); }
          }}
          onBlur={() => addNote(noteInput)}
        />
      </div>

      <div class="glass brew-radar-card">
        <div class="sub" style="align-self:flex-start">Live preview — updates as you slide</div>
        <Radar series={series} size={190} />
      </div>

      <button class="btn brew-log-btn" disabled={saving} onClick={save}>
        {saving ? "Saving…" : existing ? "Update rating" : "Save rating"}
      </button>
    </div>
  );
}
