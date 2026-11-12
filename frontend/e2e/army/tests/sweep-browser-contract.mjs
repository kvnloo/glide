// Real Chromium regression checks. Run on Boat or through fleet-build, never the owner's display.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { colors, auditDOM } from '../sweep-audit.mjs';

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
    <div id="low">Low contrast</div><div id="hidden">Not visible</div>
    <div id="big">Large type uses 3 to 1</div></div>`);
  await page.evaluate(({c,a})=>{
    globalThis.__armyColors=(0,eval)('('+c+')')();
    globalThis.__armyAudit=(0,eval)('('+a+')');
  },{c:colors.toString(),a:auditDOM.toString()});
  const findings=await page.evaluate(()=>globalThis.__armyAudit({rootSelector:'#root',theme:{id:'test-light',scheme:'light',bg:'#fff'}}));
  assert.ok(findings.some(f=>f.check==='surface'&&f.selector.includes('fh-head')));
  assert.ok(findings.some(f=>f.check==='clipped-text'&&f.selector.includes('fh-title')));
  assert.ok(findings.some(f=>f.check==='contrast'&&f.selector==='#low'));
  assert.ok(!findings.some(f=>f.selector==='#tooltip'&&f.check==='clipped-text'));
  assert.ok(findings.some(f=>f.selector==='#empty-title'&&f.check==='clipped-text'));
  assert.ok(!findings.some(f=>f.selector==='#hidden'));
  assert.ok(!findings.some(f=>f.selector==='#big'&&f.check==='contrast'));
  await page.setContent('<style>body{margin:0}div{width:500px}</style><div id="root">Overflow</div>');
  const overflow=await page.evaluate(()=>globalThis.__armyAudit({rootSelector:'#root',theme:{id:'test-light',scheme:'light',bg:'#fff'}}));
  assert.ok(overflow.some(f=>f.check==='horizontal-overflow'));
  console.log('PASS: real Chromium surface, contrast, 18px threshold, clipping, tooltip, hidden text, and overflow detectors');
} finally {await browser.close();}
