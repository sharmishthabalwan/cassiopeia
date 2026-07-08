// Brews tab — F2 brew detail: every Brew field + the per-brew taste radar
// (one series per person who rated, each in their Person.color).

import { useEffect, useState } from "preact/hooks";
import { db } from "../../lib/db";
import { Radar } from "../../lib/radar";
import type { ID, Rating } from "../../lib/types";
import { brewerLabel, findBag, fmtDate, ratioOf, type BrewsData } from "./data";

function Stat({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <div class="stat">
      <div class="stat-v">{value}</div>
      <div class="stat-k">{label}</div>
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div class="brew-kv">
      <div class="brew-kv-k">{label}</div>
      <div class="brew-kv-v">{value}</div>
    </div>
  );
}

export function BrewDetail({ data, brewId, onBack, onRate }: {
  data: BrewsData;
  brewId: ID;
  onBack: () => void;
  onRate: () => void;
}) {
  const brew = data.brews.find((b) => b.id === brewId);
  const [ratings, setRatings] = useState<Rating[] | null>(null);
  useEffect(() => { db.ratingsForBrew(brewId).then(setRatings); }, [brewId]);

  if (!brew) {
    return (
      <div>
        <button class="btn ghost brew-back" onClick={onBack}>‹ Brews</button>
        <div class="glass"><div class="sub">Brew not found.</div></div>
      </div>
    );
  }

  const bag = findBag(data.allBags, brew.bagId);
  const grinder = brew.grinderId ? data.grinders.find((g) => g.id === brew.grinderId) : undefined;
  const idea = brew.recipeId ? data.ideas.find((i) => i.id === brew.recipeId) : undefined;

  const series = (ratings ?? []).map((r) => {
    const p = data.people.find((p) => p.id === r.personId);
    return { name: p?.name ?? "You", color: p?.color ?? "var(--a1)", scores: r.scores };
  });
  const self = data.people.find((p) => p.isSelf);
  const hasSelfRating = !!(self && ratings?.some((r) => r.personId === self.id));

  return (
    <div>
      <button class="btn ghost brew-back" onClick={onBack}>‹ Brews</button>

      <div class="glass hero">
        <div class="brew-hero-name" style={bag?.color ? `color:${bag.color}` : undefined}>
          {bag?.coffeeName ?? "Unknown coffee"}
        </div>
        {bag?.roaster && <div class="brew-hero-sub">{bag.roaster}</div>}
        <div class="brew-hero-meta">
          <span class="chip hero-chip">{fmtDate(brew.date)}</span>
          <span class="chip hero-chip">{brewerLabel(data.brewers, brew.brewerId)}</span>
          {grinder && <span class="chip hero-chip">{grinder.name}</span>}
          {idea && <span class="chip hero-chip">✦ {idea.name}</span>}
        </div>
      </div>

      <div class="glass">
        <div class="stat-grid">
          <Stat label="dose" value={brew.doseG != null ? `${brew.doseG}g` : undefined} />
          <Stat label="water" value={brew.waterG != null ? `${brew.waterG}g` : undefined} />
          <Stat label="ratio" value={ratioOf(brew.doseG, brew.waterG)} />
          <Stat label="temp" value={brew.tempC != null ? `${brew.tempC}°C` : undefined} />
          <Stat label="time" value={brew.totalTime} />
          <Stat label="grind" value={brew.grind} />
        </div>
        <TextBlock label="Filter" value={brew.filter} />
        <TextBlock label="Roast date" value={brew.roastDate && fmtDate(brew.roastDate)} />
        <TextBlock label="Pour technique" value={brew.pourTechnique} />
      </div>

      {(brew.notes || brew.learnings) && (
        <div class="glass">
          <TextBlock label="Notes" value={brew.notes} />
          <TextBlock label="Learnings" value={brew.learnings} />
        </div>
      )}

      <div class="glass brew-radar-card">
        <div class="sub" style="align-self:flex-start">Taste</div>
        {ratings === null ? (
          <div class="sub">Loading…</div>
        ) : series.length === 0 ? (
          <div class="sub">No ratings for this brew yet.</div>
        ) : (
          <Radar series={series} size={200} />
        )}
      </div>

      <div class="detail-actions">
        <button class="btn" onClick={onRate}>{hasSelfRating ? "★ Edit my rating" : "★ Rate this brew"}</button>
      </div>
    </div>
  );
}
