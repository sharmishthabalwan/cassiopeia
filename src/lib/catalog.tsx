// Cassiopeia — generic Catalog (CONTRACT-OWNED).
// ONE component powers Recipes' Coffee Pros / Brewers / Styles / Roasters views.
// Adding a facet or entry is data (seed rows), never new UI code.

export interface CatalogItem { id: string; title: string; subtitle?: string; avatar?: string; }
export interface CatalogProps {
  facets: { id: string; label: string }[];   // the filter chips (pros/brewers/styles/roasters)
  activeFacet: string;
  items: CatalogItem[];                        // items for the active facet
  onOpen: (id: string) => void;                // drill into an item (e.g. a pro → their recipes)
  onQuickSave?: (id: string) => void;          // the row-level "+" quick-save to brew ideas
  onFacetChange?: (id: string) => void;        // chip tapped (parent swaps items)
}

const CSS = `
.catalog-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.catalog-chips::-webkit-scrollbar{display:none}
.catalog-chip{flex:0 0 auto;border:1px solid var(--brd);background:var(--card);color:var(--text);border-radius:999px;padding:8px 14px;font:500 13px var(--font-sans);cursor:pointer;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.catalog-chip.active{background:linear-gradient(140deg,var(--a1),var(--a2));border-color:transparent;color:#fff}
.catalog-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:none;background:none;color:var(--text);padding:0;cursor:pointer;font-family:var(--font-sans)}
.catalog-avatar{flex:0 0 40px;width:40px;height:40px;border-radius:50%;background:linear-gradient(140deg,var(--a1),var(--a2));color:#fff;display:flex;align-items:center;justify-content:center;font:600 15px var(--font-sans);overflow:hidden}
.catalog-avatar img{width:100%;height:100%;object-fit:cover}
.catalog-meta{flex:1;min-width:0}
.catalog-title{font:500 15px var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.catalog-sub{font:400 12.5px var(--font-sans);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.catalog-save{flex:0 0 32px;width:32px;height:32px;border-radius:50%;border:1px solid var(--brd);background:var(--field);color:var(--text);font:400 18px/1 var(--font-sans);cursor:pointer;display:flex;align-items:center;justify-content:center}
.catalog-save:active{background:linear-gradient(140deg,var(--a1),var(--a2));color:#fff;border-color:transparent}
.catalog-empty{color:var(--muted);font:400 14px var(--font-sans);text-align:center;padding:24px 0}
`;

export function Catalog({ facets, activeFacet, items, onOpen, onQuickSave, onFacetChange }: CatalogProps) {
  return (
    <div class="catalog">
      <style>{CSS}</style>
      <div class="catalog-chips" role="tablist">
        {facets.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={f.id === activeFacet}
            class={`catalog-chip${f.id === activeFacet ? " active" : ""}`}
            onClick={() => onFacetChange?.(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>
      {items.length === 0 && <div class="catalog-empty">Nothing here yet.</div>}
      {items.map((item) => (
        <div key={item.id} class="glass" style="display:flex;align-items:center">
          <button class="catalog-row" onClick={() => onOpen(item.id)}>
            <span class="catalog-avatar">
              {item.avatar ? <img src={item.avatar} alt="" loading="lazy" /> : item.title.slice(0, 1).toUpperCase()}
            </span>
            <span class="catalog-meta">
              <div class="catalog-title">{item.title}</div>
              {item.subtitle && <div class="catalog-sub">{item.subtitle}</div>}
            </span>
          </button>
          {onQuickSave && (
            <button
              class="catalog-save"
              aria-label={`Save ${item.title} to brew ideas`}
              onClick={(e) => { e.stopPropagation(); onQuickSave(item.id); }}
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
