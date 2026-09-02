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
.catalog-chip{flex:0 0 auto;border:1px solid var(--md-sys-color-outline);background:transparent;color:var(--md-sys-color-on-surface-variant);border-radius:var(--md-sys-shape-corner-small);padding:6px 16px;font:500 14px/20px var(--font-sans);cursor:pointer}
.catalog-chip.active{background:var(--md-sys-color-secondary-container);border-color:transparent;color:var(--md-sys-color-on-secondary-container)}
.catalog-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:none;background:none;color:var(--md-sys-color-on-surface);padding:0;cursor:pointer;font-family:var(--font-sans)}
.catalog-avatar{flex:0 0 40px;width:40px;height:40px;border-radius:50%;background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container);display:flex;align-items:center;justify-content:center;font:500 16px var(--font-sans);overflow:hidden}
.catalog-avatar img{width:100%;height:100%;object-fit:cover}
.catalog-meta{flex:1;min-width:0}
.catalog-title{font:500 16px/24px var(--font-sans);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.catalog-sub{font:400 14px/20px var(--font-sans);color:var(--md-sys-color-on-surface-variant);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.catalog-save{flex:0 0 40px;width:40px;height:40px;border-radius:50%;border:none;background:var(--md-sys-color-primary-container);color:var(--md-sys-color-on-primary-container);font:400 18px/1 var(--font-sans);cursor:pointer;display:flex;align-items:center;justify-content:center}
.catalog-save:active{background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary)}
.catalog-empty{color:var(--md-sys-color-on-surface-variant);font:400 14px var(--font-sans);text-align:center;padding:24px 0}
@media (min-width:1100px){
  .catalog{display:grid;grid-template-columns:1fr 1fr;column-gap:12px;align-items:start}
  .catalog-chips,.catalog-empty{grid-column:1/-1}
}
@media (hover:hover) and (pointer:fine){
  .catalog-chip:hover{background:color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)}
  .catalog-chip.active:hover{background:color-mix(in srgb, var(--md-sys-color-on-secondary-container) 8%, var(--md-sys-color-secondary-container))}
  .catalog-save:hover{background:var(--md-sys-color-primary);color:var(--md-sys-color-on-primary)}
}
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
