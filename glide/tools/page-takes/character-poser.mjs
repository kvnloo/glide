import assert from 'node:assert/strict'

export const viewport = { width: 1120, height: 710 }
export const fps = 60
// The fixture uses software rendering; no WebGL or virtual GPU is needed.
export const chromeArgs = ['--disable-gpu']

const GOLD = { dark:true, bg:'#100e0b', surface:'#1c1813', fg:'#faf1e4', muted:'#b2a493', accent:'#d7b986', accentInk:'#111111' }
const readRotation = '[...document.querySelectorAll("#axes output")].map(o => o.value)'
// Sliders are nested in their labels; select the axis by the input's accessible name.
const readZ = 'document.querySelector(\'[aria-label="Rotation Z"]\').valueAsNumber'
const pixels = 'document.querySelector("canvas").toDataURL()'
const nextFrame = 'new Promise(done => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))'

export async function scene(t) {
  await t.theme(GOLD)
  await t.wait(500)
  assert.equal(await t.note('rig joints', 'document.querySelectorAll("#bones button").length'),12)
  const rest = await t.eval(pixels)
  await t.click('#bones button:nth-child(5)')
  await t.click('#axis button:nth-child(3)')
  assert.equal(await t.note('selected joint', 'document.querySelector(\'#bones [aria-pressed="true"]\').textContent'),'Right shoulder')
  assert.equal(await t.eval(readZ),15)
  const points = await t.eval(`(() => {
    const r = canvas.getBoundingClientRect()
    return Array.from({length:13}, (_, i) => {
      const a = i*Math.PI/24
      return [r.left+handle.x+Math.cos(a)*handle.radius,r.top+handle.y+Math.sin(a)*handle.radius]
    })
  })()`)
  // CDP pointer drag on the actual on-canvas ring.
  points.push(points.at(-1))
  await t.drag(points)
  const angle = await t.note('ring drag: shoulder rotation Z',readZ)
  assert.ok(angle >= 102 && angle <= 108, String(angle))
  assert.notEqual(await t.eval(pixels),rest)
  const neutral = await t.eval(pixels)
  await t.click('#expressions button:nth-child(3)')
  await t.eval(nextFrame)
  assert.notEqual(await t.eval(pixels), neutral)
  assert.equal(await t.note('expression','document.querySelector(\'#expressions [aria-pressed="true"]\').textContent'),'Surprised')
  await t.click('#save')
  await t.click('#keys button:nth-child(2)')
  assert.equal(await t.eval(readZ),115)
  // Seek to the midpoint between authored keys and check angle interpolation.
  await t.eval(`(() => { const slider = document.querySelector('#time')
    slider.value = 1; slider.dispatchEvent(new Event('input')); return true })()`)
  assert.equal(await t.note('midpoint Z',readZ),110)
  await t.click('#keys button:first-child')
  assert.equal(await t.note('key restores edited angle',readZ),angle)
  assert.equal(await t.eval('document.querySelector(\'#expressions [aria-pressed="true"]\').textContent'),'Surprised')
  await t.click('#keys button:nth-child(2)')
  await t.click('#remove')
  assert.equal(await t.note('key deleted','document.querySelectorAll("#keys button").length'),2)
  await t.click('#save')
  assert.equal(await t.eval('document.querySelectorAll("#keys button").length'),3)
  await t.click('#keys button:first-child')
  await t.wait(550)
  await t.still()
  await t.click('#play')
  await t.wait(4100)
  assert.equal(await t.eval('document.querySelector("#play").textContent'),'Pause')
  await t.click('#play')
  await t.click('#reset')
  assert.deepEqual(await t.note('reset joint',readRotation),['0°','0°','0°'])
  await t.eval(nextFrame)
  await t.wait(400)
}

export async function measure(t) {
  await t.click('#play')
  const stats = await t.note('live animation without screencast (ms)',`new Promise(done => {
    const times = [], costs = [];
    const render = draw;
    draw = () => { const start = performance.now(); render(); costs.push(performance.now()-start) };
    function tick(t) {
      times.push(t);
      if (times.length < 241) return requestAnimationFrame(tick);
      draw = render;
      costs.sort((a,b) => a-b);
      const gaps = times.slice(1).map((time,i) => time-times[i]).sort((a,b) => a-b);
      const round = n => Number(n.toFixed(2));
      done({ intervals:gaps.length, fps:round(240000/(times.at(-1)-times[0])),
        median:round(gaps[120]), p95:round(gaps[227]), max:round(gaps.at(-1)),
        draws:costs.length, drawP95:round(costs[Math.floor(costs.length*.95)]),
        over25ms:gaps.filter(gap => gap>25).length });
    }
    requestAnimationFrame(tick);
  })`)
  assert.ok(stats.fps >= 59 && stats.p95 <= 17.5 && stats.draws >= 240, JSON.stringify(stats))
  await t.click('#play')
}
