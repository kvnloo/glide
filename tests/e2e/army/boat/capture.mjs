// A clean real kit frame for G0, then rendered checks for all four canary defects. Boat only.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE ?? '/usr/bin/google-chrome',
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  mkdirSync('runs/g0', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // Probe a useful clean frame, not the deliberately broken black canary surface.
  await page.route('**/army-canary.js', route => route.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.goto('http://127.0.0.1:18931/fleet.html?w=1440#theme=t3-light');
  await page.waitForSelector('html.ready');
  await page.locator('.fh-agent').first().click();
  await page.locator('.fh-btn').first().waitFor({ state: 'visible' });
  const buttons = await page.locator('button:visible').allTextContents();
  if (!buttons.some(text => text.includes('Open chat'))) throw new Error('G0 screenshot has no visible Open chat action');
  await page.screenshot({ path: 'runs/g0/kit.jpg', type: 'jpeg', quality: 90 });
  await page.screenshot({ path: 'runs/g0/kit-desktop.png', fullPage: true });
  const proof = { buttons, canary: process.env.CANARY === '1' };
  await page.unroute('**/army-canary.js');
  if (proof.canary) {
    // Same-URL fragment navigation can retain the expanded details and skip script reload.
    await page.reload();
    await page.waitForSelector('html.ready');
    await page.locator('.fh-agent').first().click();
    const button = page.locator('.fh-btn:not(:disabled)').first();
    const before = await page.evaluate(() => window.__fleet.intents.length);
    await button.click();
    const after = await page.evaluate(() => window.__fleet.intents.length);
    if (before !== after) throw new Error('dead-button seed did not apply');
    const background = await page.locator('.fh-head').evaluate(el => getComputedStyle(el).backgroundColor);
    if (background !== 'rgb(0, 0, 0)') throw new Error('light-surface seed did not apply');
    if (await page.locator('.fh-count').textContent() !== '99/6 online') throw new Error('wrong-stat seed did not apply');
    await page.screenshot({ path: 'runs/g0/canary-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:18931/fleet.html?w=390#theme=t3-light');
    await page.waitForSelector('html.ready');
    const clipped = await page.locator('.fh-title').evaluate(el => el.scrollWidth > el.clientWidth);
    if (!clipped) throw new Error('phone-label seed did not apply');
    await page.screenshot({ path: 'runs/g0/kit-phone.png', fullPage: true });
    Object.assign(proof, { deadButton: true, blackLightSurface: true, wrongStat: true, clippedLabel: true });
  }
  writeFileSync('runs/g0/rendered-check.json', JSON.stringify(proof, null, 2));
} finally { await browser.close(); }
