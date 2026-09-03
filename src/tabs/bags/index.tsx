// Cassiopeia — Bags tab screen (owned by the Bags agent).
// Renders inside .screen.hue-bags > .body; <h1>Bags</h1> already above.
// View state machine: list → detail | form (new/edit).

import { useState } from "preact/hooks";
import type { ID } from "../../lib/types";
import { useBagsData } from "./data";
import { BagList, type Filter } from "./list";
import { BagDetail } from "./detail";
import { BagForm } from "./form";
import "./bags.css";

type View =
  | { kind: "list" }
  | { kind: "detail"; bagId: ID }
  | { kind: "form"; bagId?: ID };

export default function BagsScreen() {
  const { data, refresh } = useBagsData();
  const [view, setView] = useState<View>({ kind: "list" });
  const [filter, setFilter] = useState<Filter>("open");

  if (!data) return <div class="sub">Loading…</div>;

  const toList = () => setView({ kind: "list" });

  if (view.kind === "detail") {
    return (
      <BagDetail
        data={data}
        bagId={view.bagId}
        onBack={toList}
        onEdit={() => setView({ kind: "form", bagId: view.bagId })}
        onChanged={refresh}
      />
    );
  }

  if (view.kind === "form") {
    const existing = view.bagId ? data.bags.find((b) => b.id === view.bagId) : undefined;
    return (
      <BagForm
        key={existing?.id ?? "new"}
        data={data}
        existing={existing}
        onCancel={existing ? () => setView({ kind: "detail", bagId: existing.id }) : toList}
        onSaved={async (bagId) => {
          await refresh();
          setView({ kind: "detail", bagId });
        }}
      />
    );
  }

  return (
    <BagList
      data={data}
      filter={filter}
      onFilter={setFilter}
      onOpen={(bagId) => setView({ kind: "detail", bagId })}
      onNew={() => setView({ kind: "form" })}
    />
  );
}
