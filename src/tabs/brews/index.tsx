// Cassiopeia — Brews tab screen (owned by the Brews agent).
// Renders inside .screen.hue-brews > .body; <h1>Brews</h1> already above.
// View state machine: list → detail | form (new/edit) — all in-tab state.

import { useState } from "preact/hooks";
import type { ID } from "../../lib/types";
import { useBrewsData } from "./data";
import { BrewList } from "./list";
import { BrewDetail } from "./detail";
import "./brews.css";

type View =
  | { kind: "list" }
  | { kind: "detail"; brewId: ID }
  | { kind: "form"; brewId?: ID }; // brewId set = edit

export default function BrewsScreen() {
  const { data } = useBrewsData();
  const [view, setView] = useState<View>({ kind: "list" });

  if (!data) return <div class="sub">Loading…</div>;

  const toList = () => setView({ kind: "list" });

  if (view.kind === "detail") {
    return <BrewDetail data={data} brewId={view.brewId} onBack={toList} />;
  }

  if (view.kind === "form") {
    // Stub — the logger form lands with F3.
    return (
      <div>
        <button class="btn ghost brew-back" onClick={toList}>‹ Back</button>
        <div class="glass"><div class="sub">The brew logger form lands with F3.</div></div>
      </div>
    );
  }

  return (
    <BrewList
      data={data}
      onOpen={(brewId) => setView({ kind: "detail", brewId })}
      onNew={() => setView({ kind: "form" })}
    />
  );
}
