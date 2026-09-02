// Bags tab — F3 add / edit form for every Bag field. Validation-light:
// coffee name + roaster required; everything else optional.

import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { db, newId } from "../../lib/db";
import type { Bag, ID } from "../../lib/types";
import { DEFAULT_BAG_COLOR, nextSr, photoSrc, todayISO, type BagsData } from "./data";

interface Draft {
  roaster: string;
  coffeeName: string;
  roastDate: string;
  processing: string;
  varietal: string;
  notes: string;
  origin: string;
  originCountry: string;
  altitude: string;
  season: string;
  type: string;
  scaCupScore: string;
  selection: string;
  roast: string;
  roasterLocation: string;
  roasterCountry: string;
  color: string;
  photo: string;
  finished: boolean;
  frozen: boolean;
  frozenAmount: string;
  freezeDate: string;
}

const trimmed = (s: string) => s.trim() || undefined;
const num = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <label class="f-field">
      <span class="f-label">{label}{hint && <span class="f-hint"> · {hint}</span>}</span>
      {children}
    </label>
  );
}

function fromBag(b?: Bag): Draft {
  return {
    roaster: b?.roaster ?? "",
    coffeeName: b?.coffeeName ?? "",
    roastDate: b?.roastDate ?? "",
    processing: b?.processing ?? "",
    varietal: b?.varietal ?? "",
    notes: b?.notes ?? "",
    origin: b?.origin ?? "",
    originCountry: b?.originCountry ?? "",
    altitude: b?.altitude ?? "",
    season: b?.season ?? "",
    type: b?.type ?? "",
    scaCupScore: b?.scaCupScore != null ? String(b.scaCupScore) : "",
    selection: b?.selection ?? "",
    roast: b?.roast ?? "",
    roasterLocation: b?.roasterLocation ?? "",
    roasterCountry: b?.roasterCountry ?? "",
    color: b?.color ?? DEFAULT_BAG_COLOR,
    photo: b?.photo ?? "",
    finished: b?.finished ?? false,
    frozen: b?.frozen ?? false,
    frozenAmount: b?.frozenAmount ?? "",
    freezeDate: b?.freezeDate ?? "",
  };
}

async function encodePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1000;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  const mime = canvas.toDataURL("image/webp", 0.82).startsWith("data:image/webp")
    ? "image/webp"
    : "image/jpeg";
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("encode failed")); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      mime,
      0.82,
    );
  });
}

export function BagForm({ data, existing, onSaved, onCancel }: {
  data: BagsData;
  existing?: Bag;
  onSaved: (bagId: ID) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(() => fromBag(existing));
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const input = (k: keyof Draft) => (e: Event) => {
    const el = e.currentTarget as HTMLInputElement;
    const v = el.type === "checkbox" ? el.checked : el.value;
    setD((p) => ({ ...p, [k]: v }));
  };

  const canSave = !!d.coffeeName.trim() && !!d.roaster.trim() && !saving;

  const pickPhoto = async (e: Event) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await encodePhoto(file);
      setD((p) => ({ ...p, photo: dataUrl }));
    } catch (err) {
      console.error("photo encode failed", err);
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const bag: Bag = {
      id: existing?.id ?? newId(),
      sr: existing?.sr ?? nextSr(data.bags),
      roaster: d.roaster.trim(),
      coffeeName: d.coffeeName.trim(),
      roastDate: d.roastDate || undefined,
      processing: trimmed(d.processing),
      varietal: trimmed(d.varietal),
      notes: trimmed(d.notes),
      origin: trimmed(d.origin),
      originCountry: trimmed(d.originCountry),
      altitude: trimmed(d.altitude),
      season: trimmed(d.season),
      type: trimmed(d.type),
      scaCupScore: num(d.scaCupScore),
      selection: trimmed(d.selection),
      roast: trimmed(d.roast),
      roasterLocation: trimmed(d.roasterLocation),
      roasterCountry: trimmed(d.roasterCountry),
      photo: d.photo || undefined,
      color: d.color || undefined,
      finished: d.finished,
      frozen: d.frozen,
      frozenAmount: d.frozen ? trimmed(d.frozenAmount) : undefined,
      freezeDate: d.frozen ? (d.freezeDate || undefined) : undefined,
    };
    await db.upsertBag(bag);
    onSaved(bag.id);
  };

  const preview = photoSrc(d.photo);

  return (
    <div>
      <button class="btn ghost bag-back" onClick={onCancel}>‹ Cancel</button>

      <div class="glass">
        <div class="f-section">{existing ? "Edit bag" : "New bag"}</div>
        <Field label="Coffee" hint="required">
          <input class="f-input" type="text" placeholder="Wilson Alba" value={d.coffeeName} onInput={input("coffeeName")} />
        </Field>
        <Field label="Roaster" hint="required">
          <input class="f-input" type="text" placeholder="Sey" value={d.roaster} onInput={input("roaster")} />
        </Field>
        <div class="f-row">
          <Field label="Roast date">
            <input class="f-input" type="date" value={d.roastDate} onInput={input("roastDate")} />
          </Field>
          <Field label="Roast level">
            <input class="f-input" type="text" placeholder="Light" value={d.roast} onInput={input("roast")} />
          </Field>
        </div>
        <Field label="Legend colour">
          <div class="bag-color-row">
            <input
              class="bag-color-swatch"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(d.color) ? d.color : DEFAULT_BAG_COLOR}
              onInput={input("color")}
              aria-label="Bag colour"
            />
            <input class="f-input" type="text" value={d.color} onInput={input("color")} placeholder="#A3A63A" />
          </div>
        </Field>
      </div>

      <div class="glass">
        <div class="f-section">Origin</div>
        <Field label="Origin">
          <input class="f-input" type="text" placeholder="Las Mercedes, Huila" value={d.origin} onInput={input("origin")} />
        </Field>
        <div class="f-row">
          <Field label="Country">
            <input class="f-input" type="text" placeholder="Colombia" value={d.originCountry} onInput={input("originCountry")} />
          </Field>
          <Field label="Altitude">
            <input class="f-input" type="text" placeholder="1600 masl" value={d.altitude} onInput={input("altitude")} />
          </Field>
        </div>
        <div class="f-row">
          <Field label="Varietal">
            <input class="f-input" type="text" placeholder="Pink Bourbon" value={d.varietal} onInput={input("varietal")} />
          </Field>
          <Field label="Process">
            <input class="f-input" type="text" placeholder="Washed" value={d.processing} onInput={input("processing")} />
          </Field>
        </div>
        <div class="f-row">
          <Field label="Type">
            <input class="f-input" type="text" placeholder="Single origin" value={d.type} onInput={input("type")} />
          </Field>
          <Field label="Season">
            <input class="f-input" type="text" placeholder="El Nevado" value={d.season} onInput={input("season")} />
          </Field>
        </div>
      </div>

      <div class="glass">
        <div class="f-section">Cup</div>
        <div class="f-row">
          <Field label="SCA score">
            <input class="f-input" type="number" inputMode="decimal" step="0.1" min="0" max="100" placeholder="88" value={d.scaCupScore} onInput={input("scaCupScore")} />
          </Field>
          <Field label="Selection">
            <input class="f-input" type="text" value={d.selection} onInput={input("selection")} />
          </Field>
        </div>
        <Field label="Tasting notes">
          <textarea class="f-input" rows={3} placeholder="Berry compote, lemon zest…" value={d.notes} onInput={input("notes")} />
        </Field>
      </div>

      <div class="glass">
        <div class="f-section">Roaster</div>
        <div class="f-row">
          <Field label="Location">
            <input class="f-input" type="text" value={d.roasterLocation} onInput={input("roasterLocation")} />
          </Field>
          <Field label="Country">
            <input class="f-input" type="text" placeholder="USA" value={d.roasterCountry} onInput={input("roasterCountry")} />
          </Field>
        </div>
      </div>

      <div class="glass">
        <div class="f-section">Photo</div>
        {preview && (
          <img
            class="bag-form-preview"
            src={preview}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <label class="btn ghost bag-photo-btn">
          {photoBusy ? "Resizing…" : preview ? "Replace photo" : "Add photo"}
          <input class="bag-file" type="file" accept="image/*" onChange={pickPhoto} disabled={photoBusy} />
        </label>
        {d.photo && (
          <button type="button" class="btn ghost" style="margin-top:8px" onClick={() => setD((p) => ({ ...p, photo: "" }))}>
            Remove photo
          </button>
        )}
      </div>

      <div class="glass">
        <div class="f-section">State</div>
        <div class="seg bag-toggles">
          <button
            type="button"
            class={`btn${d.finished ? "" : " ghost"}`}
            onClick={() => setD((p) => ({ ...p, finished: !p.finished }))}
          >
            {d.finished ? "Finished" : "Mark finished"}
          </button>
          <button
            type="button"
            class={`btn${d.frozen ? "" : " ghost"}`}
            onClick={() => setD((p) => ({
              ...p,
              frozen: !p.frozen,
              freezeDate: !p.frozen && !p.freezeDate ? todayISO() : p.freezeDate,
            }))}
          >
            {d.frozen ? "Frozen" : "Mark frozen"}
          </button>
        </div>
        {d.frozen && (
          <div class="bag-frozen-fields" style="margin-top:10px">
            <Field label="Frozen amount">
              <input class="f-input" type="text" placeholder="2 serves" value={d.frozenAmount} onInput={input("frozenAmount")} />
            </Field>
            <Field label="Freeze date">
              <input class="f-input" type="date" value={d.freezeDate} onInput={input("freezeDate")} />
            </Field>
          </div>
        )}
      </div>

      <button class="btn bag-save-btn" disabled={!canSave} onClick={save}>
        {saving ? "Saving…" : existing ? "Save changes" : "Save bag"}
      </button>
    </div>
  );
}
