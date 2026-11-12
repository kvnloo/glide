// Real Chromium regression checks. Run on Boat or through fleet-build, never the owner's display.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { colors, auditDOM } from '../sweep-audit.mjs';
import { freshDocument } from '../sweep-navigation.mjs';

const browser=await chromium.launch({executablePath:process.env.CHROME_EXE??'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.setContent(`<!doctype html><style>
    body{margin:0;background:#fff;color:#000} #root{width:350px}
    .fh-head{background:#000;width:300px;height:40px}
    .fh-title{width:18px;white-space:nowrap;overflow:hidden;font-size:18px}
    #tooltip,#empty-title{width:18px;white-space:nowrap;overflow:hidden}
    #low{color:#ddd} #hidden{display:none;color:#fff}
    #big{font-size:18px;color:#777}
  </style><div id="root"><div class="fh-head"></div>
    <div class="fh-title">Hosts label</div><div id="tooltip" title="Whole label">Whole label</div><div id="empty-title" title="">Still clipped</div>
    <div id="low">Low contrast</div><div id="borderline" style="color:color(srgb .4655 .4655 .4655);font-size:12px">Just below 4.5 still fails</div><div id="hidden">Not visible</div>
    <div id="big">Large type uses 3 to 1</div>
    <svg width="300" height="50"><text id="svg-low" x="0" y="20" fill="#ddd" style="color:#000;font-size:12px">SVG fill, not CSS color</text></svg>
    <div id="gradient" style="background:linear-gradient(#fff,#000)">Pixel audit needed<div id="flat" style="background:#fff;color:#fff">Opaque plate hides the gradient</div></div></div>`);
  await page.evaluate(({c,a})=>{
    globalThis.__armyColors=(0,eval)('('+c+')')();
    globalThis.__armyAudit=(0,eval)('('+a+')');
  },{c:colors.toString(),a:auditDOM.toString()});
  const findings=await page.evaluate(()=>globalThis.__armyAudit({rootSelector:'#root',theme:{id:'test-light',scheme:'light',bg:'#fff'}}));
  assert.ok(findings.some(f=>f.check==='surface'&&f.selector.includes('fh-head')));
  assert.ok(findings.some(f=>f.check==='clipped-text'&&f.selector.includes('fh-title')));
  assert.ok(findings.some(f=>f.check==='contrast'&&f.selector==='#low'));
  assert.ok(findings.some(f=>f.check==='contrast'&&f.selector==='#borderline'&&f.actual.ratio>4.49&&f.actual.ratio<4.5));
  assert.ok(!findings.some(f=>f.selector==='#tooltip'&&f.check==='clipped-text'));
  assert.ok(findings.some(f=>f.selector==='#empty-title'&&f.check==='clipped-text'));
  assert.ok(!findings.some(f=>f.selector==='#hidden'));
  assert.ok(!findings.some(f=>f.selector==='#big'&&f.check==='contrast'));
  assert.ok(findings.some(f=>f.selector==='#svg-low'&&f.check==='contrast'));
  assert.ok(findings.some(f=>f.selector==='#gradient'&&f.check==='contrast-unresolved'&&f.classification==='test bug'));
  assert.ok(findings.some(f=>f.check==='contrast'&&f.selector==='#flat'));
  assert.ok(!findings.some(f=>f.check==='contrast-unresolved'&&f.selector==='#flat'));
  await page.setContent('<style>body{margin:0}div{width:500px}</style><div id="root">Overflow</div>');
  const overflow=await page.evaluate(()=>globalThis.__armyAudit({rootSelector:'#root',theme:{id:'test-light',scheme:'light',bg:'#fff'}}));
  assert.ok(overflow.some(f=>f.check==='horizontal-overflow'));
  await page.setContent('<style>body{margin:0}#wrap{width:350px;overflow:hidden}#root{width:300px}</style><div id="wrap"><div id="root"><div style="width:500px">Clipped card</div></div></div>');
  const clippedRoot=await page.evaluate(()=>globalThis.__armyAudit({rootSelector:'#root',theme:{id:'test-light',scheme:'light',bg:'#fff'}}));
  assert.ok(clippedRoot.some(f=>f.check==='horizontal-overflow'&&f.selector==='#root'));
  assert.ok(!clippedRoot.some(f=>f.check==='horizontal-overflow'&&f.selector==='html'));
  console.log('PASS: real Chromium surface, contrast, 18px threshold, SVG fill, gradient occlusion, clipping, tooltip, hidden text, and root/document overflow detectors');
  const url='http://army.test/fleet.html#theme=light';
  await page.route('http://army.test/**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html>
    <style>#surface{background:#fff}</style><div id="surface"><span id="count">4/5 online</span>
    <button onclick="document.dispatchEvent(new CustomEvent('eui:intent'))">Open chat</button></div>`}));
  const navigate=async()=>{
    await freshDocument(page,url);
    await page.evaluate(()=>{
      globalThis.intents=0;
      document.addEventListener('eui:intent',()=>globalThis.intents++);
    });
  };
  await navigate();
  await page.evaluate(()=>{
    document.querySelector('#surface').style.background='#000';
    const patch=()=>{const n=document.querySelector('#count');if(n.textContent!=='99/6 online')n.textContent='99/6 online';};
    new MutationObserver(patch).observe(document.body,{childList:true,subtree:true});patch();
    document.addEventListener('click',e=>e.stopImmediatePropagation(),true);
  });
  assert.equal(await page.locator('#count').innerText(),'99/6 online','seed must be active');
  await navigate();
  assert.equal(await page.locator('#count').innerText(),'4/5 online','same-URL clean navigation must remove seed observer');
  assert.equal(await page.locator('#surface').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 255, 255)','seed CSS must not survive');
  await page.getByRole('button',{name:'Open chat'}).click();
  assert.equal(await page.evaluate(()=>globalThis.intents),1,'seed handler and duplicate instrumentation must not survive');
  console.log('PASS: same-URL seeded-to-clean document isolation and exactly one intent per click');
} finally {await browser.close();}
