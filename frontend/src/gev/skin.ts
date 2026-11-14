// God's Eye View's skin for GEV cards: its own sheet, apart from glide's UI_CSS, because it reproduces another
// app's HUD (9 px tracked mono titles, cyan glow) that glide's own design checks rightly forbid for glide parts.

export const GEV_SHEET = 'gev-skin'

/**
 * God's Eye View's own HUD (gods-eye-view src/ui/styles foundation.css :root, controls.css .panel-inner and
 * .panel-title), scoped to Card skin 'gev': glass panel, 9px/3px mono panel titles, cyan values.
 */
const GEV = { glass: 'rgba(12,12,20,.72)', border: 'rgba(255,255,255,.08)', accent: '#00d4ff', dimAccent: 'rgba(0,212,255,.15)', text: '#e8eaed', secondary: 'rgba(232,234,237,.5)', dim: 'rgba(232,234,237,.3)' }
const G = "[data-role='gev.card']"
export const GEV_CSS = `
${G}{background:${GEV.glass};border:1px solid ${GEV.border};border-radius:16px;color:${GEV.text};font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.03) inset,0 1px 0 rgba(255,255,255,.06) inset;backdrop-filter:blur(24px) saturate(1.4)}
${G} > .sf-card-head{font-family:'JetBrains Mono','SF Mono','Fira Code',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${GEV.dim};padding:16px 20px 0}
${G} > .sf-card-head *{font-weight:500}
${G} > .sf-card-body{padding:12px 20px 18px}
${G} [data-role='glide.picture']{border-radius:10px;overflow:hidden;border:1px solid ${GEV.border}}
${G} [data-role='glide.picture'] .sf-image{width:100%;height:auto;display:block}
${G} [data-role='glide.hero.value']{font-family:'JetBrains Mono','SF Mono',monospace;font-size:30px;font-weight:600;letter-spacing:-.02em;color:${GEV.accent};text-shadow:0 0 18px rgba(0,212,255,.4)}
${G} [data-role='glide.label'],${G} [data-role='glide.hero.detail']{font-family:'JetBrains Mono','SF Mono',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:${GEV.dim};opacity:1}
${G} [data-role='glide.text']{font-size:13px;line-height:1.45;color:${GEV.secondary}}
${G} [data-role='glide.muted']{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${GEV.dim}}
${G} [data-role='glide.table']{font-family:'JetBrains Mono','SF Mono',monospace;font-size:11px;color:${GEV.text}}
${G} [data-role='glide.table'] th{font-size:9px;letter-spacing:2px;color:${GEV.dim};font-weight:500;border-bottom:1px solid ${GEV.border}}
${G} [data-role='glide.table'] td{border-bottom:1px solid rgba(255,255,255,.04)}
${G} [data-role='glide.source']{font-family:'JetBrains Mono',monospace;font-size:9px;color:${GEV.dim};padding:6px 20px 14px}
${G} .sf-button{font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;border-radius:10px;border:1px solid rgba(0,212,255,.4);background:${GEV.dimAccent};color:${GEV.accent}}
`

