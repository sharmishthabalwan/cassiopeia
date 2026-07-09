// Brews tab — F2 brew detail: brew params, a collapsible Recipe accordion
// (pour technique + the brew idea it followed + recipe notes/learnings), and
// the per-brew taste radar with the cup's tasting notes + learnings.

import { useEffect, useState } from "preact/hooks";
import { db } from "../../lib/db";
import { Radar } from "../../lib/radar";
import type { ComponentChildren } from "preact";
import type { BrewIdea, ID, Rating } from "../../lib/types";
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

/** Collapsible section — content mounts only when open (nothing pre-rendered). */
function Accordion({ title, subtitle, children }: {
  title: string; subtitle?: string; children: ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div class={`glass brew-acc${open ? " open" : ""}`}>
      <button class="brew-acc-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span class="brew-acc-title">{title}</span>
        {subtitle && <span class="brew-acc-sub">{subtitle}</span>}
        <span class="brew-acc-chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div class="brew-acc-body">{children}</div>}
    </div>
  );
}

/** The recipe a brew followed, if any — shown inside the Recipe accordion. */
function FollowedRecipe({ idea }: { idea: BrewIdea }) {
  return (
    <div class="brew-idea-block">
      <div class="brew-idea-name">✦ Followed: {idea.name}</div>
      <div class="stat-grid">
        <Stat label="brewer" value={idea.brewer} />
        <Stat label="dose" value={idea.dose} />
        <Stat label="ratio" value={idea.ratio} />
        <Stat label="grind" value={idea.grind} />
        <Stat label="temp" value={idea.temp} />
        <Stat label="target" value={idea.targetTime} />
      </div>
      <TextBlock label="Method" value={idea.steps} />
      <TextBlock label="Source" value={[idea.author, idea.source].filter(Boolean).join(" · ") || undefined} />
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
  const selfRating = self ? ratings?.find((r) => r.personId === self.id) : undefined;
  const hasSelfRating = !!selfRating;

  const hasDetails = !!(
    brew.doseG != null || brew.waterG != null || brew.tempC != null || brew.totalTime ||
    brew.grind || brew.filter || brew.roastDate || idea || brew.pourTechnique ||
    brew.notes || brew.learnings
  );
  // Collapsed teaser: the key numbers at a glance without expanding.
  const teaser = idea
    ? `✦ ${idea.name}`
    : [brew.doseG != null ? `${brew.doseG}g` : null, ratioOf(brew.doseG, brew.waterG),
       brew.tempC != null ? `${brew.tempC}°C` : null].filter(Boolean).join(" · ");

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
          {brew.brewerId && <span class="chip hero-chip">{brewerLabel(data.brewers, brew.brewerId)}</span>}
          {grinder && <span class="chip hero-chip">{grinder.name}</span>}
          {idea && <span class="chip hero-chip">✦ {idea.name}</span>}
        </div>
      </div>

      {hasDetails && (
        <Accordion title="Recipe" subtitle={teaser || undefined}>
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
          {idea && <FollowedRecipe idea={idea} />}
          <TextBlock label="Pour technique" value={brew.pourTechnique} />
          <TextBlock label="Recipe notes" value={brew.notes} />
          <TextBlock label="Recipe learnings" value={brew.learnings} />
        </Accordion>
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
        {selfRating?.tastingNotes?.length ? (
          <div class="note-chips" style="margin-top:12px;align-self:stretch">
            {selfRating.tastingNotes.map((w) => <span class="chip note-chip">{w}</span>)}
          </div>
        ) : null}
      </div>

      {selfRating?.learnings && (
        <div class="glass">
          <TextBlock label="Cup learnings" value={selfRating.learnings} />
        </div>
      )}

      <div class="detail-actions">
        <button class="btn" onClick={onRate}>{hasSelfRating ? "★ Edit my rating" : "★ Rate this brew"}</button>
      </div>
    </div>
  );
}
