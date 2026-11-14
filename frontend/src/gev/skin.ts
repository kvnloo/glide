// God's Eye View's skin for GEV cards: its own sheet, apart from glide's UI_CSS, because it reproduces another
// app's HUD (9 px tracked mono titles, cyan glow) that glide's own design checks rightly forbid for glide parts.

export const GEV_SHEET = 'gev-skin'

/**
 * God's Eye View's own HUD (gods-eye-view src/ui/styles foundation.css :root, controls.css .panel-inner and
 * .panel-title), scoped to Card skin 'gev': glass panel, 9px/3px mono panel titles, cyan values.
 */
const GEV = { glass: 'rgba(12,12,20,.72)', border: 'rgba(255,255,255,.08)', accent: '#00d4ff', dimAccent: 'rgba(0,212,255,.15)', text: '#e8eaed', secondary: 'rgba(232,234,237,.5)', dim: 'rgba(232,234,237,.3)' }
/**
 * The card itself, class and role: with the target's own compound this outranks Tern's
 * `.sf-chat-reader :is(.sf-row,.sf-button)[…][…]`. A card's sheet scope has no chat-surface ancestor.
 */
const G = ".sf-card[data-role='gev.card']"
export const GEV_CSS = `
${G}{background:${GEV.glass};border:1px solid ${GEV.border};border-radius:16px;color:${GEV.text};font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.03) inset,0 1px 0 rgba(255,255,255,.06) inset;backdrop-filter:blur(24px) saturate(1.4)}
${G} > .sf-card-head{font-family:'JetBrains Mono','SF Mono','Fira Code',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${GEV.dim};padding:16px 20px 0}
${G} > .sf-card-head *{font-weight:500}
${G} > .sf-card-body{padding:12px 20px 18px}
${G} [data-role='glide.picture']{border-radius:10px;overflow:hidden;border:1px solid ${GEV.border}}
${G} [data-role='glide.picture'] .sf-image,${G} [data-role='glide.picture'] .sf-img-frame{width:100%;max-width:none;height:auto;display:block}
${G} [data-role='glide.hero']{min-width:150px}
${G} [data-role='glide.hero.value']{font-family:'JetBrains Mono','SF Mono',monospace;font-size:30px;font-weight:600;letter-spacing:-.02em;color:${GEV.accent};text-shadow:0 0 18px rgba(0,212,255,.4)}
${G} [data-role='glide.label'],${G} [data-role='glide.hero.detail']{font-family:'JetBrains Mono','SF Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${GEV.dim};opacity:1}
${G} [data-role='glide.text']{font-size:13px;line-height:1.45;color:${GEV.secondary}}
${G} [data-role='glide.muted']{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GEV.dim}}
${G} [data-role='glide.table']{font-family:'JetBrains Mono','SF Mono',monospace;font-size:11px;color:${GEV.text}}
${G} [data-role='glide.table'] th{font-size:9px;letter-spacing:2px;color:${GEV.dim};font-weight:500;border-bottom:1px solid ${GEV.border}}
${G} [data-role='glide.table'] td{border-bottom:1px solid rgba(255,255,255,.04)}
${G} [data-role='glide.source']{display:none}
/* radio.css .data-toggle-btn.active: GEV's lit HUD toggle. Tern's primary button paints a gradient; this replaces it. */
${G} .sf-row[data-role='omp.btn'][data-tone='accent'],${G} .sf-row[data-role='omp.btn'][data-tone='accent']:hover{font-family:'JetBrains Mono','SF Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;padding:5px 12px;border-radius:4px;color:${GEV.accent};border:1px solid ${GEV.accent};--grad:${GEV.dimAccent};--grad-ink:${GEV.accent};background-image:none;background:${GEV.dimAccent};box-shadow:0 0 10px rgba(0,212,255,.15)}
${G} .sf-row[data-role='omp.btn'][data-tone='accent']:hover{background:rgba(0,212,255,.22)}
${G} button.sf-el.hermes-press{background:transparent;background-image:none;border:0;box-shadow:none;padding:0}
${G} [data-role='glide.actions']{background:transparent;padding:0}
/* layers.css .mission-data-table: hairline cyan header rule, left-aligned cells. */
${G} .sf-tbl-h{font-family:'JetBrains Mono','SF Mono',monospace;font-size:9px;letter-spacing:2px;font-weight:400;color:rgba(190,230,230,.58);border-bottom:1px solid rgba(34,230,230,.22);text-align:left}
${G} .sf-tbl-c{font-family:'JetBrains Mono','SF Mono',monospace;font-size:11px;color:${GEV.text};text-align:left}
${G} .sf-tbl-row{border-bottom:1px solid rgba(255,255,255,.04)}
`

