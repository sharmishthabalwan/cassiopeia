// Bags tab — F2 detail + F4 finished/frozen toggles. Edit opens the full form.

import { db } from "../../lib/db";
import type { Bag, ID } from "../../lib/types";
import { fmtDate, peakInfo, photoSrc, todayISO, type BagsData } from "./data";

function Kv({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <div class="bag-kv">
      <div class="bag-kv-k">{label}</div>
      <div class="bag-kv-v">{value}</div>
    </div>
  );
}

function HeroPhoto({ bag }: { bag: Bag }) {
  const src = photoSrc(bag.photo);
  if (!src) return null;
  return (
    <img
      class="bag-hero-photo"
      src={src}
      alt=""
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export function BagDetail({ data, bagId, onBack, onEdit, onChanged }: {
  data: BagsData;
  bagId: ID;
  onBack: () => void;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const bag = data.bags.find((b) => b.id === bagId);
  if (!bag) {
    return (
      <div>
        <button class="btn ghost bag-back" onClick={onBack}>‹ Bags</button>
        <div class="glass"><div class="sub">Bag not found.</div></div>
      </div>
    );
  }

  const peak = peakInfo(bag.roastDate);
  const originLine = [bag.origin, bag.originCountry].filter(Boolean).join(", ");

  const patch = async (partial: Partial<Bag>) => {
    const next: Bag = { ...bag, ...partial };
    await db.upsertBag(next);
    await onChanged();
  };

  const toggleFinished = () => patch({ finished: !bag.finished });
  const toggleFrozen = () => {
    if (bag.frozen) return patch({ frozen: false });
    return patch({ frozen: true, freezeDate: bag.freezeDate ?? todayISO() });
  };

  return (
    <div>
      <button class="btn ghost bag-back" onClick={onBack}>‹ Bags</button>

      <div class="glass hero bag-hero">
        <HeroPhoto bag={bag} />
        <div class="bag-hero-name">
          <span class="bag-dot bag-dot-lg" style={`background:${bag.color ?? "rgba(255,255,255,.7)"}`} />
          {bag.coffeeName}
        </div>
        <div class="bag-hero-sub">{bag.roaster}</div>
        <div class="bag-hero-meta">
          {bag.roastDate && <span class="chip hero-chip">Roasted {fmtDate(bag.roastDate)}</span>}
          {bag.roast && <span class="chip hero-chip">{bag.roast}</span>}
          {bag.finished && <span class="chip hero-chip">finished</span>}
          {bag.frozen && (
            <span class="chip hero-chip">
              frozen{bag.frozenAmount ? ` · ${bag.frozenAmount}` : ""}
            </span>
          )}
          {peak && !bag.finished && (
            <span class={`chip hero-chip peak-${peak.phase}`}>{peak.label}</span>
          )}
        </div>
      </div>

      <div class="glass">
        <div class="f-section">State</div>
        <div class="seg bag-toggles">
          <button
            class={`btn${bag.finished ? "" : " ghost"}`}
            onClick={toggleFinished}
            aria-pressed={bag.finished}
          >
            {bag.finished ? "Finished" : "Mark finished"}
          </button>
          <button
            class={`btn${bag.frozen ? "" : " ghost"}`}
            onClick={toggleFrozen}
            aria-pressed={bag.frozen}
          >
            {bag.frozen ? "Frozen" : "Mark frozen"}
          </button>
        </div>
        {bag.frozen && (
          <div class="bag-frozen-fields">
            <label class="f-field">
              <span class="f-label">Frozen amount</span>
              <input
                key={`amt-${bag.id}`}
                class="f-input"
                type="text"
                placeholder="e.g. 2 serves"
                defaultValue={bag.frozenAmount ?? ""}
                onBlur={(e) => {
                  const v = (e.currentTarget as HTMLInputElement).value.trim() || undefined;
                  if (v !== bag.frozenAmount) patch({ frozenAmount: v });
                }}
              />
            </label>
            <label class="f-field">
              <span class="f-label">Freeze date</span>
              <input
                key={`date-${bag.id}`}
                class="f-input"
                type="date"
                defaultValue={bag.freezeDate ?? ""}
                onBlur={(e) => {
                  const v = (e.currentTarget as HTMLInputElement).value || undefined;
                  if (v !== bag.freezeDate) patch({ freezeDate: v });
                }}
              />
            </label>
          </div>
        )}
        {bag.finished && (
          <div class="sub" style="margin-top:8px">Hidden from the Brews coffee dropdown.</div>
        )}
      </div>

      {(originLine || bag.processing || bag.varietal || bag.altitude || bag.season || bag.type) && (
        <div class="glass">
          <div class="f-section">Origin</div>
          <Kv label="Origin" value={originLine} />
          <Kv label="Altitude" value={bag.altitude} />
          <Kv label="Varietal" value={bag.varietal} />
          <Kv label="Process" value={bag.processing} />
          <Kv label="Season" value={bag.season} />
          <Kv label="Type" value={bag.type} />
        </div>
      )}

      {(bag.roast || bag.roastDate || bag.scaCupScore != null || bag.selection || bag.notes) && (
        <div class="glass">
          <div class="f-section">Cup</div>
          <Kv label="Roast" value={bag.roast} />
          <Kv label="Roast date" value={bag.roastDate && fmtDate(bag.roastDate)} />
          <Kv label="SCA score" value={bag.scaCupScore} />
          <Kv label="Selection" value={bag.selection} />
          <Kv label="Notes" value={bag.notes} />
        </div>
      )}

      {(bag.roasterLocation || bag.roasterCountry) && (
        <div class="glass">
          <div class="f-section">Roaster</div>
          <Kv label="Location" value={bag.roasterLocation} />
          <Kv label="Country" value={bag.roasterCountry} />
        </div>
      )}

      <div class="detail-actions">
        <button class="btn" onClick={onEdit}>✎ Edit bag</button>
      </div>
    </div>
  );
}
