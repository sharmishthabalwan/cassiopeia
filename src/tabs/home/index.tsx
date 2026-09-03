// tab: home — featured latest cup + recent strip. No bag photos (not uploaded yet).

import { useEffect, useMemo, useState } from "preact/hooks";
import { db } from "../../lib/db";
import { Radar } from "../../lib/radar";
import { RATING_AXES, type AxisKey, type Brew, type ID, type Rating, type Scores } from "../../lib/types";
import { go } from "../../router";
import { brewerLabel, findBag, fmtDate, ratioOf, useBrewsData, type BrewsData } from "../brews/data";
import "./home.css";

const RECENT_N = 7;

/** Axes where 5 = highest/best — used for the "peak" tiles. Reversed axes stay off this list. */
const PEAK_KEYS = new Set<AxisKey>(
  RATING_AXES.filter((a) => a.dir.includes("highest")).map((a) => a.key),
);

function openBrew(id: ID) {
  go(`brews/${id}/view`);
}

function selfOf(ratings: Rating[] | undefined, data: BrewsData): Rating | undefined {
  const self = data.people.find((p) => p.isSelf);
  if (!self || !ratings) return undefined;
  return ratings.find((r) => r.personId === self.id);
}

function peakAxes(scores: Scores) {
  return RATING_AXES
    .filter((a) => PEAK_KEYS.has(a.key) && scores[a.key] != null && scores[a.key]! > 0)
    .sort((a, b) => (scores[b.key]! - scores[a.key]!) || a.label.localeCompare(b.label))
    .slice(0, 3);
}

function fmtScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function seriesOf(ratings: Rating[], data: BrewsData) {
  return ratings.map((r) => {
    const p = data.people.find((x) => x.id === r.personId);
    return { name: p?.name ?? "You", color: p?.color ?? "var(--a1)", scores: r.scores };
  });
}

function TasteRibbon({ scores, color }: { scores?: Scores; color?: string }) {
  return (
    <div class="home-ribbon" aria-hidden="true">
      {RATING_AXES.map((a) => {
        const v = scores?.[a.key];
        const h = v == null ? 0.14 : Math.max(0.08, Math.min(1, v / 5));
        const op = v == null ? 0.28 : 1;
        const bg = color ? `background:${color}` : "";
        return (
          <span
            key={a.key}
            class="home-ribbon-bar"
            style={`--h:${h};--op:${op};${bg}`}
            title={v == null ? `${a.label}: —` : `${a.label}: ${fmtScore(v)}`}
          />
        );
      })}
    </div>
  );
}

function Featured({
  brew, data, ratings,
}: {
  brew: Brew; data: BrewsData; ratings: Rating[] | null;
}) {
  const bag = findBag(data.allBags, brew.bagId);
  const mine = selfOf(ratings ?? undefined, data);
  const peaks = mine ? peakAxes(mine.scores) : [];
  const series = ratings ? seriesOf(ratings, data) : [];
  const name = bag?.coffeeName ?? "Unknown coffee";
  const ratio = ratioOf(brew.doseG, brew.waterG);

  return (
    <button
      type="button"
      class="glass home-featured"
      onClick={() => openBrew(brew.id)}
      aria-label={`Open ${name}, ${fmtDate(brew.date)}`}
    >
      <div class="home-kicker">Latest cup</div>
      <div class="home-feat-name" style={bag?.color ? `color:${bag.color}` : undefined}>{name}</div>
      <div class="home-feat-sub">
        {[bag?.roaster, fmtDate(brew.date)].filter(Boolean).join(" · ")}
      </div>
      <div class="home-feat-meta">
        {brew.brewerId && <span class="home-chip">{brewerLabel(data.brewers, brew.brewerId)}</span>}
        {brew.doseG != null && <span class="home-chip">{brew.doseG}g</span>}
        {ratio && <span class="home-chip">{ratio}</span>}
      </div>
      <div class="home-feat-radar">
        {ratings === null ? (
          <div class="sub">Loading taste…</div>
        ) : series.length === 0 ? (
          <div class="home-unrated">Not rated yet</div>
        ) : (
          <Radar series={series} size={148} />
        )}
      </div>
      {peaks.length > 0 && (
        <div class="home-peaks">
          {peaks.map((a) => (
            <div class="home-peak" key={a.key}>
              <div class="home-peak-v">{fmtScore(mine!.scores[a.key]!)}</div>
              <div class="home-peak-k">{a.label}</div>
            </div>
          ))}
        </div>
      )}
      {mine?.tastingNotes?.length ? (
        <div class="home-notes">
          {mine.tastingNotes.map((w) => <span class="home-chip" key={w}>{w}</span>)}
        </div>
      ) : null}
    </button>
  );
}

function EarlierRow({
  brew, data, ratings,
}: {
  brew: Brew; data: BrewsData; ratings: Rating[] | undefined;
}) {
  const bag = findBag(data.allBags, brew.bagId);
  const mine = selfOf(ratings, data);
  const name = bag?.coffeeName ?? "Unknown coffee";
  return (
    <button
      type="button"
      class="home-row"
      onClick={() => openBrew(brew.id)}
      aria-label={`Open ${name}, ${fmtDate(brew.date)}`}
    >
      <span class="home-row-date">{fmtDate(brew.date)}</span>
      <span class="home-row-main">
        <span class="home-row-name" style={bag?.color ? `color:${bag.color}` : undefined}>{name}</span>
        <span class="home-row-sub">
          {[bag?.roaster, brew.brewerId ? brewerLabel(data.brewers, brew.brewerId) : ""]
            .filter(Boolean).join(" · ")}
        </span>
      </span>
      <TasteRibbon scores={mine?.scores} color={bag?.color} />
    </button>
  );
}

export default function HomeScreen() {
  const { data } = useBrewsData();
  const recent = useMemo(() => (data ? data.brews.slice(0, RECENT_N) : []), [data]);
  const ids = recent.map((b) => b.id).join(",");
  const [ratingsByBrew, setRatingsByBrew] = useState<Record<string, Rating[]> | null>(null);

  useEffect(() => {
    if (!ids) { setRatingsByBrew({}); return; }
    let live = true;
    const brewIds = ids.split(",");
    Promise.all(brewIds.map((id) => db.ratingsForBrew(id).then((r) => [id, r] as const)))
      .then((pairs) => {
        if (!live) return;
        const map: Record<string, Rating[]> = {};
        for (const [id, r] of pairs) map[id] = r;
        setRatingsByBrew(map);
      });
    return () => { live = false; };
  }, [ids]);

  if (!data) return <div class="sub">Loading…</div>;

  if (recent.length === 0) {
    return (
      <div class="glass">
        <div class="sub">No cups yet — log a brew and it’ll land here.</div>
        <button type="button" class="btn home-empty-cta" onClick={() => go("brews")}>
          ☕ Go to Brews
        </button>
      </div>
    );
  }

  const [latest, ...earlier] = recent;

  return (
    <div class="home-layout">
      <Featured brew={latest} data={data} ratings={ratingsByBrew ? (ratingsByBrew[latest.id] ?? []) : null} />
      {earlier.length > 0 && (
        <div class="glass home-earlier">
          <div class="home-earlier-head">
            <span class="home-kicker">Earlier</span>
            <button type="button" class="home-seeall" onClick={() => go("brews")}>See all ›</button>
          </div>
          {earlier.map((b) => (
            <EarlierRow
              key={b.id}
              brew={b}
              data={data}
              ratings={ratingsByBrew?.[b.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
