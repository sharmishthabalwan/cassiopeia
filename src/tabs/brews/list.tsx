// Brews tab — F1 reverse-chron brew log list.

import type { ID } from "../../lib/types";
import { bagLabel, brewerLabel, findBag, fmtDate, type BrewsData } from "./data";

export function BrewList({ data, onOpen, onNew }: {
  data: BrewsData;
  onOpen: (brewId: ID) => void;
  onNew: () => void;
}) {
  return (
    <div>
      <button class="btn brew-log-btn" onClick={onNew}>☕ Log a brew</button>
      {data.brews.length === 0 ? (
        <div class="glass">
          <div class="sub">No brews yet — tap “Log a brew” to record your first cup.</div>
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
                <span class="chip">{brewerLabel(data.brewers, b.brewerId)}</span>
                {b.doseG != null && <span class="chip">{b.doseG}g</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
