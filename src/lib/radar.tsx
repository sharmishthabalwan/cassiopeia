// Cassiopeia — shared SVG radar (CONTRACT-OWNED).
// Hand-rolled 9-axis radar, no chart library. Superimposes one polygon per person
// (self + friends) each in that Person.color. Axes come from RATING_AXES order.
// Scores are read AS-IS — axes keep their direction (5 is not always "best"),
// so a "good" cup is not a big regular polygon. Each axis label carries its
// direction hint. Missing axis scores plot at the centre.

import { RATING_AXES, type Scores } from "./types";

export interface RadarSeries { name: string; color: string; scores: Scores; }
export interface RadarProps {
  series: RadarSeries[];   // 1 (self) or many (friends superimposed)
  size?: number;           // px, default 180
}

const PAD = 56; // room for axis labels around the chart

/** Polar → cartesian; axis 0 points up, then clockwise. v in 0..5 maps to 0..r. */
function pt(cx: number, cy: number, r: number, axis: number, v: number): [number, number] {
  const angle = -Math.PI / 2 + (axis * 2 * Math.PI) / RATING_AXES.length;
  const rr = (r * Math.max(0, Math.min(5, v))) / 5;
  return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)];
}

function poly(cx: number, cy: number, r: number, values: number[]): string {
  return values.map((v, i) => pt(cx, cy, r, i, v).map((n) => n.toFixed(1)).join(",")).join(" ");
}

export function Radar({ series, size = 180 }: RadarProps) {
  const total = size + PAD * 2;
  const c = total / 2;
  const r = size / 2;

  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      width={total}
      height={total}
      role="img"
      aria-label={`Taste radar: ${series.map((s) => s.name).join(", ")}`}
    >
      {/* grid rings 1..5 (concentric polygons) */}
      {[1, 2, 3, 4, 5].map((ring) => (
        <polygon
          points={poly(c, c, r, RATING_AXES.map(() => ring))}
          fill="none"
          stroke="var(--line)"
          stroke-width={ring === 5 ? 1.2 : 0.7}
        />
      ))}
      {/* spokes + labels with direction */}
      {RATING_AXES.map((axis, i) => {
        const [x2, y2] = pt(c, c, r, i, 5);
        const [lx, ly] = pt(c, c, r + 26, i, 5);
        return (
          <g>
            <line x1={c} y1={c} x2={x2} y2={y2} stroke="var(--line)" stroke-width="0.7" />
            <text x={lx} y={ly - 2} text-anchor="middle" font-size="9" fill="var(--text)" font-family="var(--font-sans)">
              {axis.label}
            </text>
            <text x={lx} y={ly + 7} text-anchor="middle" font-size="6.5" fill="var(--muted)" font-family="var(--font-sans)">
              {axis.dir}
            </text>
          </g>
        );
      })}
      {/* one shape per person, in their colour. UNRATED axes are SKIPPED (not
         plotted at centre) — a missing score means "not tasted for", and on the
         reversed axes a centre point would falsely read as e.g. very acidic. */}
      {series.map((s) => {
        const rated = RATING_AXES
          .map((a, i) => ({ i, v: s.scores[a.key] }))
          .filter((x): x is { i: number; v: number } => x.v !== undefined);
        const pts = rated.map(({ i, v }) => pt(c, c, r, i, v));
        const pointsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        return (
          <g>
            {pts.length >= 3 && (
              <polygon
                points={pointsStr}
                fill={s.color}
                fill-opacity="0.25"
                stroke={s.color}
                stroke-width="1.6"
                stroke-linejoin="round"
              />
            )}
            {pts.length === 2 && (
              <polyline points={pointsStr} fill="none" stroke={s.color} stroke-width="1.6" />
            )}
            {pts.map(([x, y]) => <circle cx={x} cy={y} r="2.5" fill={s.color} />)}
          </g>
        );
      })}
    </svg>
  );
}
