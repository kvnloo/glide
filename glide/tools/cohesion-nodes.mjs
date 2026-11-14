// Missing W8 fixtures. Real component trees, synthetic state, HEADLESS HTML only.
// bun glide/tools/cohesion-nodes.mjs OUT_DIR
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { welcomeNode } from '../../frontend/src/view/welcome.js'
import { STYLES } from '../../frontend/src/view/styles.js'
import { euiStyles } from '../../frontend/src/eui/cards.js'
import { hostSnapshot } from '../../frontend/src/eui/hostSnapshot.js'
import { euiCardNode } from '../../frontend/src/view/euiCard.js'
import { ternBody } from '../../frontend/src/eui/ternCss.js'
import { decodeEuiHostCard } from '../../frontend/src/wire/euiHostCard.js'
import { cleanNode, cleanOrbSvg, cleanRingSvg, CLEAN_CSS, DASH_CLEAN } from '../../frontend/src/voice/cleanFocus.js'
import { agentTreeFixture } from '../../frontend/src/agents/fixture.js'
import { agentBranches } from '../../frontend/src/agents/tree.js'
import { initialHub } from '../../frontend/src/agents/hub.js'
import { agentTreeNodes } from '../../frontend/src/agents/treeView.js'
import { WorkTreeCard } from '../../frontend/src/glideui/workTreeCard.js'
import { Transcript } from '../../frontend/src/transcript/store.js'
import { councilCard } from '../frontend/councilPopup.js'
import { demoRun } from '../frontend/council.js'
import { exchangeTiming } from '../frontend/councilExchange.js'
import { dashPalette } from '../frontend/dash.js'
import { walCss } from '../frontend/wal.js'
import { DASH, NIGHT, MONO } from '../frontend/tokens.js'

const out = resolve(process.argv[2] ?? 'cohesion-nodes')
mkdirSync(out, { recursive: true })
const escape = v => String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const blobs = new Map()
const sheets = new Map()
const svg = markup => { const id = `blob${blobs.size}`; blobs.set(id, 'data:image/svg+xml;base64,' + Buffer.from(markup).toString('base64')); return id }
const render = { click() {}, svg, style(css) { const id = `rule${sheets.size}`; sheets.set(id, `[data-eui-s='${id}']{${ternBody(css)}}`); return id } }
const spans = value => typeof value === 'string' ? escape(value) : Array.isArray(value) ? value.map(s => `<span class="${escape((s.s ?? '').split(' ').map(v => 'sf-t-'+v).join(' '))}">${escape(s.t)}</span>`).join('') : ''
function draw(n) {
  if (n == null || n === false) return ''
  if (Array.isArray(n)) return n.map(draw).join('')
  if (typeof n === 'string' || typeof n === 'number') return escape(n)
  if (typeof n.type === 'function') return draw(n.type(n.props))
  const p = n.p ?? n.props ?? {}
  const kind = n.k ?? n.type
  const kids = draw(n.c ?? p.children)
  const attrs = Object.entries({ ...p.attrs, ...(p.role ? { 'data-role':p.role } : {}) }).map(([k,v]) => ` ${k}="${escape(v)}"`).join('')
  const cls = `sf sf-${kind}${p.class ? ' '+p.class : ''}`
  const tag = kind === 'el' ? p.tag : kind === 'text' || kind === 'badge' ? 'span' : 'div'
  const box = contents => `<${tag}${attrs} class="${escape(cls)}">${contents}</${tag}>`
  if (kind === 'image') return `<img${attrs} class="sf-image" src="${escape(blobs.get(p.blob) ?? '')}" width="${p.w}" height="${p.h}" alt="${escape(p.alt ?? '')}">`
  if (kind === 'text' || kind === 'badge') return box(p.text !== undefined ? escape(p.text) : spans(p.spans))
  if (kind === 'card') return box(`${p.head ? `<div class="sf-card-head">${spans(p.head)}</div>` : ''}<div class="sf-card-body">${kids}</div>`)
  if (kind === 'tabs') return box(p.items.map(i=>`<button>${spans(i.label)}</button>`).join(''))
  if (kind === 'icon') return box('›')
  if (kind === 'spacer') return '<span style="flex:1"></span>'
  if (['el','row','col'].includes(kind)) return box((p.text ? escape(p.text) : '') + kids)
  throw new Error(`Missing HEADLESS adapter for ${kind}`)
}
const base = `:root{--l1:#191917;--l2:#272724;--l3:#3d3c39;--t1:${DASH.fg};--t2:${DASH.muted};--t3:${DASH.dim};--accent:${DASH.gold};--sans:'Hanken Grotesk',system-ui,sans-serif;--mono:${MONO};--card:#191917;--sf-p-accent:${DASH.gold}}*{box-sizing:border-box}html,body{margin:0;background:${DASH.bg};color:${DASH.fg};font:13px/1.45 var(--sans)}main{width:min(880px,calc(100vw - 32px));margin:24px auto}.sf-col{display:flex;flex-direction:column;gap:8px;min-width:0}.sf-row{display:flex;align-items:center;gap:10px;min-width:0}.sf-text{min-width:0}.sf-t-strong{font-weight:500}.sf-t-dim,.sf-t-muted{color:var(--t2)}.sf-t-mono{font-family:var(--mono)}.sf-card{border:1px solid var(--l3);border-radius:8px;padding:14px;background:var(--l1)}.sf-card-head{font-weight:500;margin-bottom:8px}.sf-card-body{min-width:0}.sf-tabs{display:flex;gap:8px}.sf-badge{font:11px var(--mono);color:var(--t2)}button{font:13px var(--sans);color:var(--t1);background:var(--l2);border:1px solid var(--l3);border-radius:4px;min-height:44px;padding:7px 16px}.glide-clean{height:calc(100vh - 48px)}.sf-image{max-width:100%}`
function page(name, tree, extra = '') {
  const body = draw(JSON.parse(JSON.stringify(tree)))
  writeFileSync(join(out, name+'.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${base}\n${euiStyles()}\n${STYLES}\n${CLEAN_CSS}\n${walCss(dashPalette())}\n${[...sheets.values()].join('\n')}\n${extra}</style><main>${body}</main>`)
}
blobs.set('logo', 'data:image/png;base64,'+readFileSync(resolve('frontend/assets/logo.png')).toString('base64'))
page('welcome', welcomeNode('welcome', { version:'v0.2.0', logo:'logo' }))
page('focus-stage', cleanNode({blob:svg(cleanRingSvg(DASH_CLEAN,25,50,NIGHT.border))},{blob:svg(cleanOrbSvg(DASH_CLEAN,'thinking',1.2,true))},25))
const agents=agentTreeFixture(50000)
const hub={...initialHub(agents), expanded:['planner']}
page('agents-tree', {type:'el',props:{tag:'div',attrs:{'data-agent-tree':'',role:'tree'},children:agentTreeNodes(agentBranches(agents,false),hub,50000,()=>{},render.style)}})
const t = new Transcript()
t.user({text:'Add search; test the keyboard flow',at:1});t.messageStart(2)
t.todos([{id:'feature',content:'Search',status:'in_progress'},{id:'keys',parent:'feature',content:'Verify keyboard flow',status:'pending'}])
t.toolStart({tool_id:'edit',name:'patch',args:{path:'/sample/atlas/src/search.ts',old_string:'old',new_string:'new'}},3)
const work = new WorkTreeCard(()=>{})
await work.ready()
page('work-tree',work.node(t,'/sample/atlas',{send(){}},(key,css)=>sheets.set(key,css)))
t.toolComplete({tool_id:'edit',name:'patch',result:{success:true}},4)
t.complete({status:'complete',text:'Search input updated.'},5)
page('work-receipt',work.node(t,'/sample/atlas',{send(){}},(key,css)=>sheets.set(key,css)))
work.dispose()
for (const [name, raw] of Object.entries({
  receipt:{kind:'receipt',app:'glide',title:'Workspace ready',summary:'Three reviewed files created.',rows:[{label:'Files',value:3},{label:'Tests',value:'12 passed'}]},
  hosts:{kind:'receipt',app:'glide',title:'Hosts',summary:'Atlas is ready for the next task.',rows:[{label:'atlas',value:'Ready · 4 lanes'},{label:'laptop',value:'Ready · 2 lanes'},{label:'phone',value:'Connected'}]},
  focus:{kind:'receipt',app:'glide.focus',title:'Deep work',rows:[{label:'block',value:'on'},{label:'left',value:25},{label:'length',value:50},{label:'held',value:2},{label:'until',value:'16:30'},{label:'phase',value:'Focused'},{label:'flow',value:'Quiet'},{label:'bedtime',value:'23:00'}]}
})) {
  const data=decodeEuiHostCard(raw,['approve','receipt'])
  page(name,euiCardNode(name,{spec:{kind:data.kind,app:data.app},app:data.app,label:data.title,node:hostSnapshot(data,'pending')},render))
}
const run=demoRun()
for (const [name,frame] of [['council-brief',null],['council-report',exchangeTiming(run,true).total]]) {
  page(name,euiCardNode(name,{spec:{kind:'council',app:'glide'},app:'glide',label:'Council',node:councilCard({run,live:false,from:'SAMPLE'}, {t:frame},320,true,{reduceMotion:true})},render))
}
writeFileSync(join(out,'fixtures.json'),JSON.stringify({kind:'HEADLESS',synthetic:true,native:false,surfaces:['welcome','focus-stage','agents-tree','work-tree','work-receipt','receipt','hosts','focus','council-brief','council-report']},null,2))
console.log(out)
