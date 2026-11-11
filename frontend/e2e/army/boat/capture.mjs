// A real kit frame for G0, plus rendered canary checks. Boat only.
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: process.env.CHROME_EXE ?? '/usr/bin/google-chrome',
  headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  mkdirSync('runs/g0', { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:18931/fleet.html?w=1440#theme=t3-light');
  await page.waitForSelector('html.ready');
  await page.screenshot({ path: 'runs/g0/kit.jpg', type: 'jpeg', quality: 90 });
  await page.screenshot({ path: 'runs/g0/kit-desktop.png', fullPage: true });
  const buttons = await page.locator('button').allTextContents();
  if (!buttons.some(text => text.includes('Agents'))) throw new Error('G0 screenshot has no fleet buttons');
  const proof = { buttons, canary: process.env.CANARY === '1' };
  if (proof.canary) {
    const button = page.locator('.fh-needs');
    const before = await button.getAttribute('aria-pressed');
    await button.click();
    if (await button.getAttribute('aria-pressed') !== before) throw new Error('dead-button seed did not apply');
    const background = await page.locator('.fh-root').evaluate(el => getComputedStyle(el).backgroundColor);
    if (background !== 'rgb(0, 0, 0)') throw new Error('light-surface seed did not apply');
    if (await page.locator('.fh-count').textContent() !== '99/6 online') throw new Error('wrong-stat seed did not apply');
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
