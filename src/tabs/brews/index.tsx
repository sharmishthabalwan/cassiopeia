// Cassiopeia — Brews tab screen (owned by the Brews agent).
// Renders inside .screen.hue-brews > .body; <h1>Brews</h1> already above.
// View state machine: list → detail | form (new/edit) — all in-tab state.

import { useState } from "preact/hooks";
import type { ID } from "../../lib/types";
import { useBrewsData } from "./data";
import { BrewList } from "./list";
import { BrewDetail } from "./detail";
import { BrewForm } from "./form";
import { RateBrew } from "./ratings";
import "./brews.css";

type View =
  | { kind: "list" }
  | { kind: "detail"; brewId: ID }
  | { kind: "form"; brewId?: ID } // brewId set = edit
  | { kind: "rate"; brewId: ID };

export default function BrewsScreen() {
  const { data, refresh } = useBrewsData();
  const [view, setView] = useState<View>({ kind: "list" });

  if (!data) return <div class="sub">Loading…</div>;

  const toList = () => setView({ kind: "list" });

  if (view.kind === "detail") {
    return (
      <BrewDetail
        data={data}
        brewId={view.brewId}
        onBack={toList}
        onRate={() => setView({ kind: "rate", brewId: view.brewId })}
      />
    );
  }

  if (view.kind === "form") {
    const existing = view.brewId ? data.brews.find((b) => b.id === view.brewId) : undefined;
    return (
      <BrewForm
        data={data}
        existing={existing}
        onCancel={toList}
        onSaved={async (brewId) => {
          await refresh();
          // New brews flow straight into rating; edits return to the list.
          setView(existing ? { kind: "list" } : { kind: "rate", brewId });
        }}
      />
    );
  }

  if (view.kind === "rate") {
    const toDetail = () => setView({ kind: "detail", brewId: view.brewId });
    return <RateBrew data={data} brewId={view.brewId} onDone={toDetail} onCancel={toDetail} />;
  }

  return (
    <BrewList
      data={data}
      onOpen={(brewId) => setView({ kind: "detail", brewId })}
      onNew={() => setView({ kind: "form" })}
    />
  );
}
