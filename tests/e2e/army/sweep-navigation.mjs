// Each sweep case owns a document; hash-only navigation must not retain seed mutations/listeners.
export async function freshDocument(page, url) {
  await page.goto('about:blank', {waitUntil:'commit'});
  await page.goto(url, {waitUntil:'networkidle',timeout:60000});
}
