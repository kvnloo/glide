import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { agents } from './agent.ts';
import { armyBrowser } from './browser.ts';

const kit = { url: process.env.KIT_URL ?? 'http://127.0.0.1:18931/' };
const tern = { url: process.env.TERN_URL ?? 'http://127.0.0.1:18932/' };
const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const target = (name: string, app: { url: string }, viewport: typeof desktop) =>
  ({ name, engine: web({ viewport, connect: armyBrowser(viewport) }), app });

export default {
  tests: ['tests/smoke.e2e.ts'],
  agents,
  targets: [target('kit-desktop', kit, desktop), target('kit-phone', kit, phone),
            target('tern-desktop', tern, desktop), target('tern-phone', tern, phone)],
  output: '.e2e/army',
} satisfies E2EConfig;
