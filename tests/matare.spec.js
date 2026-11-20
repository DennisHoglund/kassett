const { test, expect, bild } = require('./hjalp');

const SKAL = [
  ['vu', 'LEVEL'],
  ['eq', 'GRAPHIC EQUALIZER'],
  ['spektrum', 'SPECTRUM ANALYZER'],
  ['topp', 'PEAK LEVEL METER']
];

test.describe('Nivåmätare', () => {
  test('analoga VU-mätare är förvalda', async ({ dack: page }) => {
    await expect(page.locator('#niva')).toHaveAttribute('data-skal', 'vu');
    await expect(page.locator('#matare-namn')).toHaveText('LEVEL');
    await expect(page.locator('.vu-matare')).toHaveCount(2);
  });

  test('tryck på mätaren byter skal i tur och ordning och valet sparas', async ({ dack: page }) => {
    for (let i = 0; i < SKAL.length; i++) {
      const [id, namn] = SKAL[i];
      await expect(page.locator('#niva')).toHaveAttribute('data-skal', id);
      await expect(page.locator('#matare-namn')).toHaveText(namn);
      const box = await page.locator('#niva').boundingBox();
      expect(box.y + box.height).toBeLessThanOrEqual(932);
      await bild(page, 'Mätare: ' + namn);
      await page.locator('#matare').click();
    }
    await expect(page.locator('#niva')).toHaveAttribute('data-skal', 'vu');
    await page.locator('#matare').click();
    await page.reload();
    await expect(page.locator('#niva')).toHaveAttribute('data-skal', 'eq');
    await expect(page.locator('.eq-staplar .stapel')).toHaveCount(10);
  });

  test('skal väljs i inställningarna', async ({ dack: page }) => {
    await page.locator('#eject').click();
    await expect(page.locator('input[name="skal"][value="vu"]')).toBeChecked();
    await page.getByLabel('Däckets toppmätare').check();
    await expect(page.locator('#niva')).toHaveAttribute('data-skal', 'topp');
    await expect(page.locator('.topp-led')).toHaveCount(2);
    await page.getByLabel('Spektrumanalysator').check();
    await expect(page.locator('.spek-staplar .stapel')).toHaveCount(16);
    await page.locator('#stang').click();
    await expect(page.locator('#matare-namn')).toHaveText('SPECTRUM ANALYZER');
  });

  test('mätaren står still när musiken är pausad', async ({ page, api }) => {
    const { inloggad, spelare } = require('./mock');
    api.spelare = spelare({ is_playing: false });
    await inloggad(page);
    await page.goto('./');
    await expect(page.locator('#titel')).toHaveText('Mannen i den vita hatten');
    const anim = await page.locator('.nal').first().evaluate((e) => getComputedStyle(e).animationName);
    expect(anim).toBe('none');
  });
});
