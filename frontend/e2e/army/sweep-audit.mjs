// Pure verdict rules shared by Node contracts and the browser's computed-style audit.
export function colors() {
  const parse = value => {
    if (value.startsWith('#')) {
      let h = value.slice(1);
      if (h.length === 3) h = [...h].map(x => x+x).join('');
      return [0,2,4].map(i => parseInt(h.slice(i,i+2),16)).concat(h.length===8 ? parseInt(h.slice(6),16)/255 : 1);
    }
    const n = value.match(/-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [0,0,0,0];
    const scale=value.startsWith('color(srgb ')?255:1;
    return [n[0]*scale,n[1]*scale,n[2]*scale,n[3] ?? 1];
  };
  const over = (a,b) => a.slice(0,3).map((n,i) => n*a[3]+b[i]*(1-a[3])).concat(1);
  const lum = rgb => rgb.slice(0,3).map(x => x/255).map(x => x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4)
    .reduce((sum,x,i) => sum+x*[.2126,.7152,.0722][i],0);
  const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
  return {parse,over,lum,contrast};
}

export function controlOutcome({before, after, intents, navigation}) {
  if (intents.length) return 'intent';
  if (navigation) return 'navigation';
  return before !== after ? 'dom-change' : 'dead';
}

export function canaryRecall(sweep, findings) {
  const expected = {'sweep-clicks':['dead-button'],
    'sweep-themes':['black-light-surface','phone-clipped-label','wrong-stat'],
    'sweep-console':[], 'sweep-build':[]}[sweep];
  const checks = {'dead-button':'dead-control','black-light-surface':'surface',
    'phone-clipped-label':'clipped-text','wrong-stat':'data-consistency'};
  const reported = expected.filter(id => findings.some(f => f.canary===id && f.check===checks[id] && f.selector));
  return {expected, reported, missed:expected.filter(id => !reported.includes(id)),
    recall:expected.length ? reported.length/expected.length : null,
    method:'detector + selector on served-copy defects; console/build have no matching planted defect'};
}

// Serialized into the page; all dependencies are installed explicitly by the caller.
export function auditDOM({rootSelector, theme}) {
  const {parse,over,lum,contrast} = globalThis.__armyColors;
  const root = document.querySelector(rootSelector);
  if (!root) throw new Error('Audit root absent: '+rootSelector);
  const selector = el => {
    const bits = [];
    for (let n=el; n && n!==document.documentElement; n=n.parentElement) {
      if (n.id) { bits.unshift('#'+CSS.escape(n.id)); break; }
      bits.unshift(n.tagName.toLowerCase()+[...n.classList].filter(c=>!c.startsWith('army-')).slice(0,2).map(c=>'.'+CSS.escape(c)).join('')+
        ':nth-child('+([...n.parentElement.children].indexOf(n)+1)+')');
    }
    return bits.join(' > ');
  };
  const visible = el => {
    if (!el.getClientRects().length || !el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})) return false;
    return !el.closest('[hidden], [aria-hidden="true"]');
  };
  const background = el => {
    const stack=[];
    for (let p=el;p;p=p.parentElement) stack.push(parse(getComputedStyle(p).backgroundColor));
    return stack.reverse().reduce((bg,fg)=>over(fg,bg),parse(theme.bg));
  };
  const result=[];
  const elements = [root,...root.querySelectorAll('*')];
  for (const el of elements) {
    if (!visible(el) || ['SCRIPT','STYLE','SVG','PATH','OPTION'].includes(el.tagName)) continue;
    const s=getComputedStyle(el), rect=el.getBoundingClientRect(), own=parse(s.backgroundColor);
    const meta={selector:selector(el), text:el.textContent.trim().slice(0,150)};
    const add=(check,actual,expected,canary)=>result.push({...meta,check,actual,expected,...(canary?{canary}:{})});
    // Measure opaque, substantial surfaces; small icons are not panel backgrounds.
    if (own[3]>.95 && rect.width>80 && rect.height>24) {
      const extremeBlack=own.slice(0,3).every(x=>x===0), extremeWhite=own.slice(0,3).every(x=>x===255);
      if ((extremeBlack && lum(parse(theme.bg))>.5) || (extremeWhite && lum(parse(theme.bg))<.1))
        add('surface',s.backgroundColor,'surface polarity agrees with theme '+theme.id,
          el.matches('.fh-head') && theme.scheme==='light' ? 'black-light-surface':undefined);
    }
    const textNodes=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE && n.textContent.trim());
    if (!textNodes.length) continue;
    // Read every visible text run. Composite foreground alpha and inherited opacity over its backdrop.
    let opacity=1;
    for(let p=el;p;p=p.parentElement) opacity*=Number(getComputedStyle(p).opacity);
    const svgText=el.namespaceURI==='http://www.w3.org/2000/svg' && ['text','tspan'].includes(el.tagName.toLowerCase());
    const ink=svgText && s.fill!=='none'?s.fill:s.color;
    const fg=parse(ink); fg[3]*=opacity*(svgText?Number(s.fillOpacity):1);
    let bg=background(el);
    if(svgText) {
      const plate=el.closest('g')?.querySelector('rect.ff-pill');
      if(plate) bg=over(parse(getComputedStyle(plate).fill),bg);
    }
    const ratio=contrast(over(fg,bg),bg), threshold=parseFloat(s.fontSize)>=18?3:4.5;
    let image='none';
    for(let p=el;p;p=p.parentElement) if(getComputedStyle(p).backgroundImage!=='none') {image=getComputedStyle(p).backgroundImage;break;}
    if(image!=='none') result.push({...meta,check:'contrast-unresolved',actual:{backgroundImage:image},expected:'pixel-backed contrast for a non-flat background',classification:'test bug'});
    else if (ratio+.01<threshold) add('contrast',{ratio:Number(ratio.toFixed(2)),color:ink,background:bg,fontSize:s.fontSize},'contrast >= '+threshold);
    for (let p=el;p && root.contains(p);p=p.parentElement) {
      const ps=getComputedStyle(p);
      if (['hidden','clip'].includes(ps.overflowX) && p.scrollWidth>p.clientWidth+1 && !el.closest('[title]')?.title.trim()) {
        add('clipped-text',{scrollWidth:p.scrollWidth,clientWidth:p.clientWidth,clippingAncestor:selector(p)},'text fits or has a title tooltip',el.matches('.fh-title')?'phone-clipped-label':undefined);
        break;
      }
    }
  }
  if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1)
    result.push({check:'horizontal-overflow',selector:'html',actual:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},expected:'no horizontal overflow'});
  return result;
}
