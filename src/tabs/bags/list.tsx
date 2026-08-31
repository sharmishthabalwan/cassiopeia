// Bags tab — F1 card grid + plus button to add a bag.

import type { Bag, ID } from "../../lib/types";
import { fmtDate, peakInfo, photoSrc, type BagsData } from "./data";

export type Filter = "open" | "frozen" | "finished" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "frozen", label: "Frozen" },
  { id: "finished", label: "Finished" },
  { id: "all", label: "All" },
];

function matches(bag: Bag, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "finished") return bag.finished;
  if (filter === "frozen") return bag.frozen && !bag.finished;
  return !bag.finished;
}

function BagPhoto({ photo, name }: { photo?: string; name: string }) {
  const src = photoSrc(photo);
  const initial = name.slice(0, 1).toUpperCase();
  if (!src) return <div class="bag-thumb bag-thumb-empty" aria-hidden="true">{initial}</div>;
  return (
    <>
      <img
        class="bag-thumb"
        src={src}
        alt=""
        loading="lazy"
        onError={(e) => {
          const el = e.currentTarget as HTMLImageElement;
          el.style.display = "none";
          const fallback = el.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.hidden = false;
        }}
      />
      <div class="bag-thumb bag-thumb-empty" hidden aria-hidden="true">{initial}</div>
    </>
  );
}

function BagRow({ bag, onOpen }: { bag: Bag; onOpen: (id: ID) => void }) {
  const peak = !bag.finished && !bag.frozen ? peakInfo(bag.roastDate) : undefined;
  return (
    <button
      class={`bag-row${bag.finished ? " finished" : ""}`}
      onClick={() => onOpen(bag.id)}
    >
      <div class="bag-thumb-wrap">
        <BagPhoto photo={bag.photo} name={bag.coffeeName} />
      </div>
      <div class="bag-row-meta">
        <span class="bag-row-name" style={bag.color ? `color:${bag.color}` : undefined}>
          <span class="bag-dot" style={`background:${bag.color ?? "var(--a1)"}`} />
          {bag.coffeeName}
        </span>
        <span class="bag-row-roaster">{bag.roaster}</span>
        {bag.roastDate && <span class="chip">{fmtDate(bag.roastDate)}</span>}
        {bag.frozen && (
          <span class="chip">
            frozen{bag.frozenAmount ? ` · ${bag.frozenAmount}` : ""}
          </span>
        )}
        {bag.finished && <span class="chip">finished</span>}
        {peak && <span class={`chip peak-${peak.phase}`}>{peak.label}</span>}
      </div>
    </button>
  );
}

export function BagList({ data, filter, onFilter, onOpen, onNew }: {
  data: BagsData;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onOpen: (id: ID) => void;
  onNew: () => void;
}) {
  const shown = data.bags.filter((b) => matches(b, filter));
  return (
    <div>
      <div class="bag-toolbar">
        <button class="btn bag-add-btn" onClick={onNew} aria-label="Add bag">
          <span class="bag-plus" aria-hidden="true">+</span>
          Add bag
        </button>
      </div>

      <div class="bag-chips" role="tablist" aria-label="Filter bags">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            class={`bag-chip${filter === f.id ? " active" : ""}`}
            onClick={() => onFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div class="glass">
          <div class="sub">
            {data.bags.length === 0
              ? "No bags yet — tap + to add your first coffee."
              : "Nothing in this filter."}
          </div>
        </div>
      ) : (
        <div class="glass bag-list">
          {shown.map((b) => <BagRow key={b.id} bag={b} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}
