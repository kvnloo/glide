import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('kit renders fleet cards', async ({ app, browser }) => {
  await app.open('/fleet.html?w=1440');
  await expect(browser.locator('.fh-title')).toBeVisible();
  await expect(browser.locator('.ff-graph')).toBeVisible();
});
