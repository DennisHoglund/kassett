// Gemensamma fixturer och skärmdumpar till rapporten.
const base = require('@playwright/test');
const { mocka, inloggad } = require('./mock');

const test = base.test.extend({
  api: async ({ page }, use) => { await use(await mocka(page)); },
  // Inloggad, en låt spelas
  dack: async ({ page, api }, use) => {
    await inloggad(page);
    await page.goto('./');
    await base.expect(page.locator('#titel')).toHaveText('Mannen i den vita hatten');
    await use(page);
  }
});

async function bild(page, namn) {
  await page.waitForTimeout(300);
  await test.info().attach(namn, { body: await page.screenshot(), contentType: 'image/png' });
}

module.exports = { test, expect: base.expect, bild };
