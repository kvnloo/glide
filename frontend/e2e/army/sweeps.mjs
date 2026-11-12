// Deterministic Playwright sweeps. Headless Boat only; no inference API is configured.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { colors, controlOutcome, canaryRecall, auditDOM } from './sweep-audit.mjs';

process.chdir('/home/user/army');
if (realpathSync(process.cwd()) !== realpathSync('/home/user/army')) throw new Error('Sweeps run only in an owned Boat sandbox');
const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = 'runs/'+config.id;
mkdirSync(out, {recursive:true});
const report = {status:'running', findings:[], controls:[], checks:[], screenshots:[], coverage:[], gaps:[]};
const browser = await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--enable-unsafe-webgpu','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce', permissions:['clipboard-read','clipboard-write']});
let page, serial=0, scope={};
const errors=[];
function watch(p) {
  p.on('pageerror',error=>errors.push({...scope,check:'pageerror',selector:'document',actual:error.message}));
  p.on('console',msg=>{if(msg.type()==='error') errors.push({...scope,check:'console.error',selector:'console',actual:msg.text()});});
  p.on('dialog',dialog=>dialog.dismiss());
}
context.on('page',watch);
page=await context.newPage();
async function shot(label, root) {
  root ??= scope.root;
  const path=out+'/'+String(++serial).padStart(4,'0')+'-'+label.replace(/[^a-z0-9_-]/gi,'_').slice(0,120)+'.png';
  if(root) await page.locator(root).screenshot({path,timeout:30000});
  else await page.screenshot({path,fullPage:true,timeout:30000});
  report.screenshots.push(path);
  return path;
}
function finding(item, evidence) {
  const seed=config.canary && scope.phase==='canary' && item.canary;
  if(scope.phase==='canary' && !seed) return; // Clean-build findings are already recorded.
  const clean={...item};
  if(!seed) delete clean.canary;
  report.findings.push({...scope,...clean,title:item.check+': '+(item.text||item.actual?.message||JSON.stringify(item.actual)).slice(0,180),
    severity:'major',classification: seed?'canary':(item.classification??'real defect'),evidence:[evidence],
    repro_steps:[`Open ${scope.url??config.url}`,`Set theme ${scope.theme??'default'}, viewport ${scope.width??1440}`,item.selector??'Inspect browser console']});
}
async function instrument() {
  await page.evaluate(({colorsCode,auditCode})=>{
    globalThis.__armyColors=(0,eval)('('+colorsCode+')')();
    globalThis.__armyAudit=(0,eval)('('+auditCode+')');
    globalThis.__armyIntents=[];
    document.addEventListener('eui:intent',e=>globalThis.__armyIntents.push(e.detail));
    document.addEventListener('eui:action',e=>globalThis.__armyIntents.push(e.detail));
  },{colorsCode:colors.toString(),auditCode:auditDOM.toString()});
}
async function navigate(url, canary=false) {
  scope.url=url;
  if(!canary) await page.route('**/army-canary.js',r=>r.fulfill({body:'',contentType:'text/javascript'}));
  else await page.unroute('**/army-canary.js');
  await page.goto(url,{waitUntil:'networkidle',timeout:60000});
  if(url.includes('fleet.html')) await page.waitForSelector('html.ready');
  await instrument();
}
async function visibleState(root) {
  return page.locator(root).evaluate(el=>{
    const text=[];
    const walk=document.createTreeWalker(el,NodeFilter.SHOW_ELEMENT);
    let n=el;
    do {
      if(!n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||n.closest('[hidden]')) continue;
      const direct=[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE).map(c=>c.textContent).join('').trim();
      if(direct) text.push(direct);
      if(n.hasAttribute('aria-pressed')) text.push(n.textContent+':pressed='+n.getAttribute('aria-pressed'));
      if(n.hasAttribute('aria-expanded')) text.push(n.textContent+':expanded='+n.getAttribute('aria-expanded'));
      if(n.matches('details')) text.push('details:'+n.open);
    } while((n=walk.nextNode()));
    return JSON.stringify(text);
  });
}
async function controls(root, canary=false) {
  const seen=new Set();
  for(let iteration=0;iteration<2000;iteration++) {
    // Assign identity without relying on volatile nth-child paths after DOM replacement.
    const inventory=await page.locator(root).evaluate(el=>{
      const path=n=>{
        const bits=[];
        for(let p=n;p&&p!==el;p=p.parentElement) {
          if(p.id){bits.unshift('#'+CSS.escape(p.id));break;}
          bits.unshift(p.tagName.toLowerCase()+':nth-child('+([...p.parentElement.children].indexOf(p)+1)+')');
        }
        return bits.join(' > ');
      };
      return [...el.querySelectorAll('button,select,input[type=checkbox],input[type=radio],[role=button],summary')]
        .filter(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})&&!n.closest('[hidden]'))
        .flatMap(n=>{
          const data={selector:path(n),tag:n.tagName,label:(n.getAttribute('aria-label')||n.textContent||n.title).trim().slice(0,120),
            disabled:n.matches(':disabled,[aria-disabled=true]'),reason:n.title||n.getAttribute('aria-description')||'',
            checked:n.checked, context:n.closest('details,li,tr,.pm-task,.ff-node')?.textContent.trim().slice(0,240)??''};
          return n.tagName==='SELECT'?[...n.options].map(o=>({...data,option:o.value,optionDisabled:o.disabled,selected:o.selected})): [data];
        }).sort((a,b)=>Number(a.tag==='SELECT')-Number(b.tag==='SELECT'));
    });
    const key=c=>JSON.stringify([c.selector,c.label,c.option,c.context,c.disabled]);
    const control=inventory.find(c=>!seen.has(key(c)));
    if(!control) return;
    seen.add(key(control));
    const result={...scope,...control};
    if(control.disabled||control.optionDisabled) {
      result.outcome=control.reason?'unavailable':'missing-disabled-reason';
      report.controls.push(result);
      if(!control.reason) finding({check:'disabled-reason',...control,actual:'disabled without a reason',expected:'title + visible reason'},await shot('disabled'));
      continue;
    }
    const locator=page.locator(root).locator(control.selector).first();
    try {
      if(await locator.count()===0) throw new Error('control disappeared before action');
      await locator.scrollIntoViewIfNeeded();
      if(control.tag==='SELECT' && control.selected) {
        const alternative=inventory.find(c=>c.selector===control.selector&&c.option!==control.option&&!c.optionDisabled);
        if(alternative) await locator.selectOption(alternative.option);
      }
      const before=await visibleState(root);
      const intents=await page.evaluate(()=>globalThis.__armyIntents.length);
      const url=page.url();
      let navigated=false;
      const onNavigation=frame=>{if(frame===page.mainFrame())navigated=true;};
      page.on('framenavigated',onNavigation);
      if(control.tag==='SELECT') {
        await locator.selectOption(control.option);
      } else if(control.tag==='INPUT') await locator.setChecked(!control.checked);
      else if(/hold/i.test(control.label) || await locator.evaluate(el=>el.classList.contains('hold'))) {
        const box=await locator.boundingBox();
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
        await page.mouse.down(); await page.waitForTimeout(1250); await page.mouse.up();
      } else await locator.click({timeout:4000});
      await page.waitForTimeout(180);
      page.off('framenavigated',onNavigation);
      const after=await visibleState(root).catch(()=>'<root removed>');
      const emitted=await page.evaluate(n=>globalThis.__armyIntents?.slice(n)??[],intents).catch(()=>[]);
      result.outcome=controlOutcome({before,after,intents:emitted,navigation:navigated||page.url()!==url});
      result.intents=emitted;
      report.controls.push(result);
      if(result.outcome==='dead') {
        const item={check:'dead-control',...control,actual:'enabled control has no visible DOM change, intent, navigation, or unavailable reason',expected:'observable effect'};
        if(canary&&control.label==='Open chat') item.canary='dead-button';
        finding(item,await shot('dead-control'));
      }
    } catch(error) {
      result.outcome='automation-gap'; result.error=error.message;
      report.controls.push(result);
      report.gaps.push({...scope,selector:control.selector,error:error.message,classification:'test bug'});
    }
  }
  report.gaps.push({...scope,error:'control traversal exceeded 2000 distinct controls',classification:'test bug'});
}
async function dataConsistency() {
  const check=await page.evaluate(async()=>{
    if(!document.querySelector('.fh-count')) return null;
    // This is the exact authored array fleet.html's demo:true passes into the card, not a hardcoded expected count.
    const {HOSTS}=await import('./js/fleet-data.js');
    return {displayed:document.querySelector('.fh-count').textContent.trim(),online:HOSTS.filter(h=>h.online).length,total:HOSTS.length};
  });
  if(!check) return;
  const numbers=check.displayed.match(/(\d+)\s*\/\s*(\d+)/);
  const pass=!!numbers&&Number(numbers[1])===check.online&&Number(numbers[2])===check.total;
  report.checks.push({...scope,check:'data-consistency',...check,pass});
  if(!pass) finding({check:'data-consistency',selector:'.fh-count',actual:check,expected:'online count equals hosts with online=true',canary:'wrong-stat'},await shot('wrong-stat'));
}
async function fleetClicks(canary=false) {
  for(const width of [390,768,1440]) {
    scope={phase:canary?'canary':'clean',surface:'fleet',theme:'t3-light',width};
    await page.setViewportSize({width,height:900});
    await navigate('http://127.0.0.1:18931/fleet.html?w='+width+'#theme=t3-light',canary);
    for(const kind of ['fleet-hosts','fleet-portfolio','fleet-factory']) {
      scope.kind=kind;
      await controls(`#stage > .cell[data-kind="${kind}"]`,canary);
    }
    await shot('fleet-clicks-'+scope.phase+'-'+width);
  }
}
async function galleryClicks() {
  scope={phase:'clean',surface:'gallery',theme:'t3-light',width:1440};
  await page.setViewportSize({width:1440,height:900});
  await navigate('http://127.0.0.1:18931/#theme=t3-light');
  await page.locator('#kindgrid .kcell').first().waitFor({state:'attached',timeout:30000});
  await page.locator('#kindbar button').filter({hasText:'All'}).click();
  const kinds=await page.locator('#kindgrid .kcell .kl code').allTextContents();
  if(!kinds.length) throw new Error('gallery has no kinds');
  for(let i=0;i<kinds.length;i++) {
    scope.kind=kinds[i];
    const root='#kindgrid .kcell:nth-child('+(i+1)+')';
    await page.locator(root).scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    await controls(root);
    report.coverage.push({...scope,controls:report.controls.filter(c=>c.surface==='gallery'&&c.kind===scope.kind).length});
    await shot('gallery-'+scope.kind,root);
  }
}
async function fleetThemes(canary=false) {
  const themes=JSON.parse(readFileSync('site/data/themes.json','utf8')).themes;
  for(const theme of themes) for(const width of [390,768,1440]) for(const kind of ['fleet-hosts','fleet-portfolio','fleet-factory']) {
    scope={phase:canary?'canary':'clean',surface:'fleet',theme:theme.id,width,kind};
    await page.setViewportSize({width,height:900});
    await navigate(`http://127.0.0.1:18931/fleet.html?kind=${kind}&w=${width}#theme=${theme.id}`,canary);
    // Expand every details element, including actions that otherwise never get a theme check.
    await page.locator('details').evaluateAll(nodes=>nodes.forEach(n=>n.open=true));
    const items=await page.evaluate(({theme})=>globalThis.__armyAudit({rootSelector:'#stage',theme}),{theme});
    const evidence=await shot(kind+'-'+theme.id+'-'+width+'-'+scope.phase);
    for(const item of items) finding(item,evidence);
    report.checks.push({...scope,check:'computed-style',pass:items.length===0,evidence});
    await dataConsistency();
    report.coverage.push({...scope});
  }
}
async function ternSweep() {
  scope={phase:'clean',surface:'tern',width:1440,theme:'runtime'};
  await navigate(config.url);
  await page.waitForTimeout(3000);
  await shot('tern-initial');
  writeFileSync(out+'/tern-dom.html',await page.content());
  const native=await page.locator('button,select,input[type=checkbox],[role=button]').count();
  report.coverage.push({...scope,nativeControls:native});
  if(config.sweep==='sweep-build') {
    const pin=JSON.parse(readFileSync('/home/user/glide/frontend/src/vendor/ephemeral-ui/PIN.json','utf8'));
    const bundle=readFileSync('/home/user/glide/frontend/dist/entry.js','utf8');
    const archived=readFileSync('/home/user/glide/ARMY_SHA','utf8').trim();
    report.checks.push({...scope,check:'archive-sha',actual:archived,expected:config.sha,pass:archived===config.sha});
    report.checks.push({...scope,check:'vendor-parity',actual:pin.sha,expected:config.expected_pin,pass:pin.sha===config.expected_pin});
    if(pin.sha!==config.expected_pin) finding({check:'vendor-parity',selector:'frontend/src/vendor/ephemeral-ui/PIN.json',actual:pin.sha,expected:config.expected_pin},await shot('pin-mismatch'));
    const evidence=await page.locator('body').innerText();
    const exposed=evidence.includes(config.sha)&&evidence.includes(pin.sha);
    report.checks.push({...scope,check:'pane-build-provenance',pass:exposed,actual:evidence.slice(0,2000),expected:'queryable Glide SHA and vendor PIN in the Tern pane',bundleBytes:bundle.length});
    if(!exposed) report.gaps.push({...scope,error:'Build/PIN not exposed in initial Tern DOM; cannot certify served build from archive marker',classification:'provider gap'});
  } else if(native) {
    await controls('body');
    if(config.sweep==='sweep-themes') report.gaps.push({...scope,error:'Tern transcript fixture and full theme matrix not yet observable',classification:'test bug'});
  } else report.gaps.push({...scope,error:'Tern web client exposes no DOM controls; inspect tern-dom.html and screenshot',classification:'provider gap'});
  // The same detector must prove its kit canary even when the lane's primary target is Tern.
}
let code=1;
try {
  if(config.target==='kit') {
    if(config.sweep==='sweep-clicks'||config.sweep==='sweep-console') {await fleetClicks();await galleryClicks();}
    if(config.sweep==='sweep-themes'||config.sweep==='sweep-console') await fleetThemes();
  } else await ternSweep();
  if(config.canary) {
    if(config.sweep==='sweep-clicks') await fleetClicks(true);
    if(config.sweep==='sweep-themes') await fleetThemes(true);
  }
  const consoleShot=errors.length?await shot('console-errors'):null;
  if(config.sweep==='sweep-console') for(const item of errors) finding({...item,classification:'real defect'},consoleShot);
  report.console=errors;
  report.canary=canaryRecall(config.sweep,report.findings);
  report.status=report.canary.missed.length?'canary-fail':report.gaps.length?'coverage-gap':report.findings.some(f=>f.classification!=='canary')?'findings':'passed';
  code=report.canary.missed.length||report.gaps.length||report.findings.some(f=>f.classification!=='canary')?1:0;
} catch(error) {
  report.status='failed';report.error=error.stack;
  try{await shot('failure');}catch{}
  report.canary=canaryRecall(config.sweep,report.findings);
} finally {
  writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
  await browser.close();
}
console.log(JSON.stringify({status:report.status,controls:report.controls.length,findings:report.findings.length,gaps:report.gaps.length,canary:report.canary}));
process.exitCode=code;
