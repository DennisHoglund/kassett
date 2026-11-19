const { test, expect, bild } = require('./hjalp');
const { inloggad, spelare, KLIENT } = require('./mock');

test.describe('Inloggning', () => {
  test('utan inloggning visas luckan och Spotify anropas inte', async ({ page, api }) => {
    await page.goto('./');
    await expect(page.locator('#lucka')).toBeVisible();
    await expect(page.locator('#adress')).toHaveText('http://127.0.0.1:4174/');
    await expect(page.locator('#logga-ut')).toBeHidden();
    expect(api.anrop).toEqual([]);
    await page.locator('#klient').fill('fel');
    await page.locator('#logga-in').click();
    await expect(page.locator('#status')).toHaveText('Klistra in ett giltigt Client ID (32 tecken) först.');
    await bild(page, 'Luckan utan inloggning');
  });

  test('hela inloggningen med PKCE och tillbaka till kassetten', async ({ page, api }) => {
    let authorize = null;
    await page.route('https://accounts.spotify.com/authorize?**', async (r) => {
      authorize = new URL(r.request().url());
      const tillbaka = 'http://127.0.0.1:4174/?code=kod-1&state=' + authorize.searchParams.get('state');
      // WebKit i Playwright kan inte svara med 302, så en sida skickar tillbaka i stället
      await r.fulfill({ status: 200, contentType: 'text/html', body: `<script>location.replace(${JSON.stringify(tillbaka)})</script>` });
    });
    await page.goto('./');
    await page.locator('#klient').fill(KLIENT);
    await page.locator('#logga-in').click();
    await expect(page.locator('#titel')).toHaveText('Mannen i den vita hatten');
    await expect(page.locator('#lucka')).toBeHidden();
    await expect(page).toHaveURL('http://127.0.0.1:4174/');

    const q = authorize.searchParams;
    expect(q.get('client_id')).toBe(KLIENT);
    expect(q.get('redirect_uri')).toBe('http://127.0.0.1:4174/');
    expect(q.get('code_challenge_method')).toBe('S256');
    expect(q.get('scope')).toBe('user-read-playback-state user-read-currently-playing user-modify-playback-state');
    const byte = api.anrop.find((a) => a.url === 'token authorization_code');
    expect(byte.form.code).toBe('kod-1');
    expect(byte.form.code_verifier).toHaveLength(64);
  });

  test('avbruten inloggning visar ett fel i luckan', async ({ page, api }) => {
    await page.goto('./?error=access_denied&state=x');
    await expect(page.locator('#status')).toHaveText('Inloggningen avbröts. Försök igen.');
    await expect(page).toHaveURL('http://127.0.0.1:4174/');
  });

  test('utgången inloggning öppnar luckan igen', async ({ page, api }) => {
    api.tokenFel = 'invalid_grant';
    await page.addInitScript(() => {
      localStorage.setItem('kassett-spotify', JSON.stringify({ klient: '0123456789abcdef0123456789abcdef', access: 'gammal', utgar: 0, refresh: 'r' }));
    });
    await page.goto('./');
    await expect(page.locator('#lucka')).toBeVisible();
    await expect(page.locator('#status')).toHaveText('Spotify-inloggningen har gått ut. Logga in igen.');
    await expect(page.locator('#klient')).toHaveValue(KLIENT);
  });

  test('utloggning via eject-knappen', async ({ dack: page }) => {
    await page.locator('#eject').click();
    await expect(page.locator('#status')).toHaveText('Inloggad med Spotify.');
    await page.locator('#stang').click();
    await expect(page.locator('#lucka')).toBeHidden();
    await page.locator('#eject').click();
    await page.locator('#logga-ut').click();
    await expect(page.locator('#status')).toHaveText('Utloggad.');
    await expect(page.locator('#logga-in')).toBeVisible();
    await expect(page.locator('#titel')).toHaveText('Inget spelas');
  });
});

test.describe('Nu spelas', () => {
  test('kassetten visar låt, artist, omslag, tid och enhet', async ({ dack: page }) => {
    await expect(page.locator('#klocka')).toHaveText('21:38');
    await expect(page.locator('#datum')).toHaveText('torsdag 19 nov');
    await expect(page.locator('#artist')).toHaveText('Kent');
    await expect(page.locator('#enhet')).toHaveText('Dennis iPhone');
    await expect(page.locator('#omslag')).toHaveAttribute('src', 'https://i.scdn.co/image/mellan');
    await expect(page.locator('#polaroid')).toBeVisible();
    await expect(page.locator('#pos')).toHaveText('1:12');
    await expect(page.locator('#langd')).toHaveText('3:31');
    await expect(page.locator('body')).toHaveClass(/spelar/);
    await expect(page.locator('#spela')).toHaveAttribute('aria-label', 'Pausa');
    await bild(page, 'Kassetten spelar');
  });

  test('lång titel får mindre text och allt ryms på skärmen', async ({ page, api }) => {
    api.spelare = spelare();
    api.spelare.item.name = 'Sweet Child O’ Mine (Remastered 2018 version)';
    await inloggad(page);
    await page.goto('./');
    await expect(page.locator('#titel')).toHaveClass(/liten/);
    const niva = await page.locator('.niva').boundingBox();
    expect(niva.y + niva.height).toBeLessThanOrEqual(932);
    const kassett = await page.locator('#kassett').boundingBox();
    expect(kassett.x).toBeGreaterThanOrEqual(0);
    expect(kassett.x + kassett.width).toBeLessThanOrEqual(430);
    await bild(page, 'Lång titel');
  });

  test('inget spelas visar tom etikett utan omslag', async ({ page, api }) => {
    api.spelare = null;
    await inloggad(page);
    await page.goto('./');
    await expect.poll(() => api.anrop.some((a) => a.url === 'GET /me/player')).toBe(true);
    await expect(page.locator('#titel')).toHaveText('Inget spelas');
    await expect(page.locator('#polaroid')).toBeHidden();
    await expect(page.locator('body')).not.toHaveClass(/spelar/);
    await expect(page.locator('#enhet')).toHaveText('Ingen enhet');
  });

  test('Spotify nere visar en rad och försöker igen', async ({ page, api }) => {
    api.nere = true;
    await inloggad(page);
    await page.goto('./');
    await expect(page.locator('#meddelande')).toHaveText('Ingen kontakt med Spotify, försöker igen');
    await expect(page.locator('#klocka')).toHaveText('21:38');
  });
});

test.describe('Tangenter', () => {
  test('nästa, föregående, paus och spela styr Spotify', async ({ dack: page, api }) => {
    await page.locator('#nasta').click();
    await expect.poll(() => api.anrop.some((a) => a.url === 'POST /me/player/next')).toBe(true);
    await page.locator('#forra').click();
    await expect.poll(() => api.anrop.some((a) => a.url === 'POST /me/player/previous')).toBe(true);

    api.spelare = spelare({ is_playing: false });
    await page.locator('#spela').click();
    await expect.poll(() => api.anrop.some((a) => a.url === 'PUT /me/player/pause')).toBe(true);
    await expect(page.locator('body')).not.toHaveClass(/spelar/);
    await expect(page.locator('#spela')).toHaveAttribute('aria-label', 'Spela');

    api.spelare = spelare();
    await page.locator('#spela').click();
    await expect.poll(() => api.anrop.some((a) => a.url === 'PUT /me/player/play')).toBe(true);
    await expect(page.locator('body')).toHaveClass(/spelar/);
  });

  test('tryck på förloppet spolar i låten', async ({ dack: page, api }) => {
    const r = await page.locator('#forlopp').boundingBox();
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    await expect.poll(() => api.anrop.some((a) => a.url.startsWith('PUT /me/player/seek'))).toBe(true);
    const ms = Number(api.anrop.find((a) => a.url.startsWith('PUT /me/player/seek')).url.split('=')[1]);
    expect(Math.abs(ms - 105500)).toBeLessThan(1500);
    await expect(page.locator('#pos')).toHaveText(/^1:4[45]$/);
  });

  test('utan Premium visas ett fel och kassetten fortsätter fungera', async ({ dack: page, api }) => {
    api.premium = false;
    await page.locator('#nasta').click();
    await expect(page.locator('#meddelande')).toHaveText('Styrning kräver Spotify Premium.');
    await expect(page.locator('#titel')).toHaveText('Mannen i den vita hatten');
  });

  test('utan aktiv enhet väcks telefonen när man trycker spela', async ({ page, api }) => {
    api.spelare = null;
    api.aktivEnhet = false;
    await inloggad(page);
    await page.goto('./');
    await expect(page.locator('#titel')).toHaveText('Inget spelas');
    await page.locator('#spela').click();
    await expect.poll(() => api.anrop.some((a) => a.url === 'PUT /me/player/play?device_id=iph')).toBe(true);
    await expect(page.locator('#meddelande')).toHaveText('');
  });
});
