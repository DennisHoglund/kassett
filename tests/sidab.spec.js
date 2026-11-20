const { test, expect, bild } = require('./hjalp');
const { inloggad, spelare, nastaLat } = require('./mock');

test.describe('Sida B och låtbyte', () => {
  test('Sida B visar nästa låt i kön med omslag', async ({ dack: page }) => {
    await expect(page.locator('#b-titel')).toHaveText('The Final Countdown');
    await expect(page.locator('#b-artist')).toHaveText('Europe');
    await expect(page.locator('#b-omslag')).toHaveAttribute('src', 'https://i.scdn.co/image/b-liten');
    const niva = await page.locator('#niva').boundingBox();
    expect(niva.y + niva.height).toBeLessThanOrEqual(932);
    expect(niva.height).toBeGreaterThan(100);
    await bild(page, 'Kassetten med Sida B');
  });

  test('ny låt matar ut kassetten och sätter i en ny med ny etikett', async ({ dack: page, api }) => {
    api.spelare = spelare({ item: { ...nastaLat(), duration_ms: 240000 } });
    api.ko = [nastaLat({ id: 'lat3', name: 'Dancing Queen', artists: [{ name: 'ABBA' }] })];
    await page.locator('#nasta').click();
    await expect(page.locator('#kassett')).toHaveClass(/ut/);
    await expect(page.locator('body')).toHaveClass(/byter/);
    await expect(page.locator('#titel')).toHaveText('The Final Countdown');
    await expect(page.locator('#kassett')).not.toHaveClass(/ut|start/);
    await expect(page.locator('#b-titel')).toHaveText('Dancing Queen');
    await expect(page.locator('body')).not.toHaveClass(/byter/);
    await bild(page, 'Efter låtbytet');
  });

  test('tom kö visar att inget är på väg', async ({ page, api }) => {
    api.ko = [];
    await inloggad(page);
    await page.goto('./');
    await expect(page.locator('#titel')).toHaveText('Mannen i den vita hatten');
    await expect(page.locator('#b-titel')).toHaveText('Inget i kön');
    await expect(page.locator('#b-omslag')).toBeHidden();
  });

  test('samma låt hämtar inte kön igen', async ({ dack: page, api }) => {
    await expect(page.locator('#b-titel')).toHaveText('The Final Countdown');
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect.poll(() => api.anrop.filter((a) => a.url === 'GET /me/player').length).toBeGreaterThan(1);
    expect(api.anrop.filter((a) => a.url === 'GET /me/player/queue').length).toBe(1);
  });
});
