// Mockar Spotify, omslag och typsnitt så att testerna är snabba och oberoende av riktig trafik.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==', 'base64');

// Fast tid i alla tester: torsdag 19 november 2026 kl 21:38 (svensk tid)
const NU = new Date('2026-11-19T21:38:00+01:00');

const KLIENT = '0123456789abcdef0123456789abcdef';

function spelare(over) {
  return Object.assign({
    is_playing: true,
    progress_ms: 72000,
    device: { id: 'iph', name: 'Dennis iPhone', type: 'Smartphone' },
    item: {
      id: 'lat1', name: 'Mannen i den vita hatten', duration_ms: 211000,
      artists: [{ id: 'a1', name: 'Kent' }],
      album: { name: 'Vapen & ammunition', images: [
        { url: 'https://i.scdn.co/image/stor', width: 640 },
        { url: 'https://i.scdn.co/image/mellan', width: 300 },
        { url: 'https://i.scdn.co/image/liten', width: 64 }
      ] }
    }
  }, over || {});
}

async function mocka(page) {
  const api = {
    spelare: spelare(),   // null = inget spelas (204)
    premium: true,
    aktivEnhet: true,
    nere: false,
    token: { access_token: 'ny-nyckel', expires_in: 3600, refresh_token: 'refresh-1' },
    tokenFel: null,
    anrop: []
  };

  await page.clock.setFixedTime(NU);
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://i.scdn.co/**', (r) => r.fulfill({ status: 200, contentType: 'image/png', body: PNG }));

  await page.route('https://accounts.spotify.com/api/token', async (r) => {
    const form = new URLSearchParams(r.request().postData() || '');
    api.anrop.push({ url: 'token ' + form.get('grant_type'), form: Object.fromEntries(form) });
    if (api.tokenFel) return r.fulfill({ status: 400, json: { error: api.tokenFel, error_description: 'Refresh token revoked' } });
    return r.fulfill({ status: 200, json: api.token });
  });

  await page.route('https://api.spotify.com/v1/**', async (r) => {
    const req = r.request();
    const u = new URL(req.url());
    const nyckel = req.method() + ' ' + u.pathname.replace('/v1', '') + u.search;
    api.anrop.push({ url: nyckel });
    if (api.nere) return r.abort();
    if (req.method() === 'GET' && u.pathname === '/v1/me/player') {
      return api.spelare ? r.fulfill({ status: 200, json: api.spelare }) : r.fulfill({ status: 204, body: '' });
    }
    if (u.pathname === '/v1/me/player/devices') {
      return r.fulfill({ status: 200, json: { devices: [{ id: 'iph', name: 'Dennis iPhone', type: 'Smartphone', is_active: false }] } });
    }
    if (!api.premium) return r.fulfill({ status: 403, json: { error: { status: 403, message: 'Premium required', reason: 'PREMIUM_REQUIRED' } } });
    if (!api.aktivEnhet && !u.search.includes('device_id')) return r.fulfill({ status: 404, json: { error: { status: 404, message: 'No active device', reason: 'NO_ACTIVE_DEVICE' } } });
    return r.fulfill({ status: 204, body: '' });
  });
  return api;
}

// Sparar en inloggning på enheten innan sidan laddas
async function inloggad(page) {
  await page.addInitScript((klient) => {
    localStorage.setItem('kassett-spotify', JSON.stringify({ klient, access: 'nyckel', utgar: 4102444800000, refresh: 'refresh-0' }));
  }, KLIENT);
}

module.exports = { mocka, inloggad, spelare, KLIENT, PNG };
