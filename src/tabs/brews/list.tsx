// Brews tab — F1 reverse-chron brew log list.

import type { ID } from "../../lib/types";
import { bagLabel, brewerLabel, findBag, fmtDate, type BrewsData } from "./data";

export function BrewList({ data, onOpen, onNew, onForm }: {
  data: BrewsData;
  onOpen: (brewId: ID) => void;
  onNew: () => void;
  onForm: () => void;
}) {
  return (
    <div>
      <div class="brew-ctas">
        <button class="btn brew-cta" onClick={onNew}>
          <span class="brew-cta-icon" aria-hidden="true">📄</span>
          Upload or paste
        </button>
        <button class="btn ghost brew-cta" onClick={onForm}>
          <span class="brew-cta-icon" aria-hidden="true">✎</span>
          Fill the form
        </button>
      </div>
      {data.brews.length === 0 ? (
        <div class="glass">
          <div class="sub">No brews yet — upload a daily log or fill the form.</div>
        </div>
      ) : (
        <div class="glass brew-list">
          {data.brews.map((b) => {
            const bag = findBag(data.allBags, b.bagId);
            return (
              <button key={b.id} class="brew-row" onClick={() => onOpen(b.id)}>
                <span class="brew-date">{fmtDate(b.date)}</span>
                <span class="brew-name" style={bag?.color ? `color:${bag.color}` : undefined}>
                  {bagLabel(data.allBags, b.bagId)}
                </span>
                {b.brewerId && <span class="chip">{brewerLabel(data.brewers, b.brewerId)}</span>}
                {b.doseG != null && <span class="chip">{b.doseG}g</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
