// Brews tab — F4 rate a brew: 9 sliders in RATING_AXES order, EACH labeled
// with its direction (axis.dir — 5 is not always "best"), step 0.5, 1..5;
// tasting-note chips; live Radar preview; saves the SELF person's Rating.
// Scores are stored AS-IS — no inversion anywhere.

import { useEffect, useMemo, useState } from "preact/hooks";
import { db } from "../../lib/db";
import { Radar } from "../../lib/radar";
import { RATING_AXES, type ID, type Rating, type Scores } from "../../lib/types";
import { bagLabel, fmtDate, type BrewsData } from "./data";

// Axes start UNSET — an axis you never touch stays unrated ("—") and is omitted
// from the saved scores, rather than being forced to a number you didn't mean.
// NEUTRAL is only the resting thumb position for an unset slider.
const NEUTRAL = 3;

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
  const [learnings, setLearnings] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const ratings = await db.ratingsForBrew(brewId);
      if (!live) return;
      const mine = self ? ratings.find((r) => r.personId === self.id) : undefined;
      setExisting(mine ?? null);
      // Only carry forward axes the rating actually had — unrated stay unset.
      setScores({ ...(mine?.scores ?? {}) });
      setNotes(mine?.tastingNotes ?? []);
      setLearnings(mine?.learnings ?? "");
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
      learnings: learnings.trim() || undefined, // cup learnings (from tasting)
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
        <div class="rate-hint">Slide only the aspects you tasted for — leave the rest as “—”.</div>
        {RATING_AXES.map((axis) => {
          const v = scores[axis.key];
          const isSet = v !== undefined;
          return (
            <div class={`rate-row${isSet ? "" : " unset"}`} key={axis.key}>
              <div class="rate-head">
                <span class="rate-label">{axis.label}</span>
                <span class="rate-dir">{axis.dir}</span>
                <span class="rate-right">
                  {isSet && (
                    <button
                      class="rate-clear"
                      aria-label={`Clear ${axis.label}`}
                      onClick={() => setScores((s) => { const n = { ...s }; delete n[axis.key]; return n; })}
                    >
                      ×
                    </button>
                  )}
                  <span class="rate-val">{isSet ? v.toFixed(1) : "—"}</span>
                </span>
              </div>
              <input
                class="rate-slider"
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={isSet ? v : NEUTRAL}
                aria-label={`${axis.label} (${axis.dir})`}
                onInput={(e) => {
                  const nv = parseFloat((e.currentTarget as HTMLInputElement).value);
                  setScores((s) => ({ ...s, [axis.key]: nv }));
                }}
              />
            </div>
          );
        })}
      </div>

      <div class="glass">
        <div class="f-section">Cup</div>
        <div class="f-label">Tasting notes</div>
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
          class="f-input note-input"
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
        <div class="f-label" style="margin-top:14px">Cup learnings <span class="f-hint">· what the tasting taught you</span></div>
        <textarea
          class="f-input"
          rows={3}
          placeholder="e.g. 92°C rounded the acidity; body still thin — try 1:15 next time"
          value={learnings}
          onInput={(e) => setLearnings((e.currentTarget as HTMLTextAreaElement).value)}
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
