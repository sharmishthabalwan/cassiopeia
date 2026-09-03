// Cassiopeia — Brews tab screen (owned by the Brews agent).
// Renders inside .screen.hue-brews > .body; <h1>Brews</h1> already above.
// View state machine: list → detail | log (upload/paste) | form (new/edit) | rate.

import { useEffect, useState } from "preact/hooks";
import type { ID } from "../../lib/types";
import { go, hashParts, onRouteChange } from "../../router";
import { useBrewsData } from "./data";
import { BrewList } from "./list";
import { BrewDetail } from "./detail";
import { BrewForm } from "./form";
import { BrewLogImport } from "./log";
import { RateBrew } from "./ratings";
import "./brews.css";

type View =
  | { kind: "list" }
  | { kind: "detail"; brewId: ID; readOnly?: boolean }
  | { kind: "log" }              // upload / paste a daily log (default new-brew path)
  | { kind: "form"; brewId?: ID } // brewId set = edit; no brewId = blank form
  | { kind: "rate"; brewId: ID };

/** Home deep-links here with `#/brews/<id>/view` (view-only detail). */
function viewFromHash(): View {
  const parts = hashParts();
  if (parts[0] === "brews" && parts[1]) {
    return { kind: "detail", brewId: parts[1], readOnly: parts[2] === "view" };
  }
  return { kind: "list" };
}

export default function BrewsScreen() {
  const { data, refresh } = useBrewsData();
  const [view, setView] = useState<View>(viewFromHash);

  useEffect(() => {
    const onHash = () => {
      const next = viewFromHash();
      setView((cur) => {
        if (next.kind === "detail") return next;
        // Bare #/brews: leave in-tab form/rate/edit alone; only close a
        // Home deep-link (view-only detail) back to the list.
        if (cur.kind === "detail" && cur.readOnly) return { kind: "list" };
        return cur;
      });
    };
    onRouteChange(onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  if (!data) return <div class="sub">Loading…</div>;

  const toList = () => setView({ kind: "list" });

  if (view.kind === "detail") {
    const readOnly = !!view.readOnly;
    return (
      <BrewDetail
        data={data}
        brewId={view.brewId}
        readOnly={readOnly}
        onBack={readOnly ? () => go("home") : toList}
        onRate={() => setView({ kind: "rate", brewId: view.brewId })}
        onEdit={() => setView({ kind: "form", brewId: view.brewId })}
      />
    );
  }

  if (view.kind === "log") {
    return (
      <BrewLogImport
        data={data}
        onCancel={toList}
        onUseForm={() => setView({ kind: "form" })}
        onSaved={async (brewId, info) => {
          await refresh();
          if (info.count > 1) setView({ kind: "list" });
          else if (info.rated) setView({ kind: "detail", brewId });
          else setView({ kind: "rate", brewId });
        }}
      />
    );
  }

  if (view.kind === "form") {
    const existing = view.brewId ? data.brews.find((b) => b.id === view.brewId) : undefined;
    return (
      <BrewForm
        data={data}
        existing={existing}
        onCancel={existing ? () => setView({ kind: "detail", brewId: existing.id }) : toList}
        onUseLog={existing ? undefined : () => setView({ kind: "log" })}
        onSaved={async (brewId) => {
          await refresh();
          // New brews flow into rating; edits return to that brew’s detail.
          setView(existing ? { kind: "detail", brewId } : { kind: "rate", brewId });
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
      onNew={() => setView({ kind: "log" })}
      onForm={() => setView({ kind: "form" })}
    />
  );
}
