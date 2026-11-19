// Spotify: inloggning med PKCE (ingen hemlighet), vad som spelas och styrning av Spotify-appen.
// Client ID och nycklar sparas bara på enheten (kassett-spotify). Ljudet spelas alltid i Spotify-appen.
window.KassettSpotify = (function () {
  const C = () => window.KASSETT_CONFIG.api;
  const NYCKEL = 'kassett-spotify';
  const OMFANG = 'user-read-playback-state user-read-currently-playing user-modify-playback-state';

  // ---------- Lagring ----------
  function las() { try { return JSON.parse(localStorage.getItem(NYCKEL)) || {}; } catch (e) { return {}; } }
  function spara(d) { try { localStorage.setItem(NYCKEL, JSON.stringify(d)); } catch (e) { /* fullt eller avstängt */ } }
  function uppdatera(f) { const d = las(); f(d); spara(d); return d; }
  const inloggad = () => !!las().refresh;
  const klient = () => las().klient || '';
  function omdirigering() { return location.origin + location.pathname; }

  // ---------- PKCE ----------
  function slump(n) {
    const a = new Uint8Array(n);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[b % 66]).join('');
  }
  async function utmaning(verifierare) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifierare)));
    let bin = ''; h.forEach((x) => { bin += String.fromCharCode(x); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // Skickar vidare till Spotify. Kastar fel med svensk text om något saknas.
  async function loggaIn(klientId) {
    const id = String(klientId || '').replace(/\s/g, '');
    if (!/^[0-9a-f]{32}$/i.test(id)) throw new Error('Klistra in ett giltigt Client ID (32 tecken) först.');
    const verifierare = slump(64), state = slump(16);
    uppdatera((d) => { d.klient = id; d.verifierare = verifierare; d.state = state; });
    const q = new URLSearchParams({
      client_id: id, response_type: 'code', redirect_uri: omdirigering(), scope: OMFANG,
      code_challenge_method: 'S256', code_challenge: await utmaning(verifierare), state
    });
    location.href = C().spotifyKonto + '/authorize?' + q.toString();
  }
  function loggaUt() { spara({ klient: las().klient }); }

  async function token(form) {
    const res = await fetch(C().spotifyKonto + '/api/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString()
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error('Spotify-inloggningen misslyckades: ' + (j.error_description || j.error || res.status)); e.kod = j.error; throw e; }
    uppdatera((d) => {
      d.access = j.access_token;
      d.utgar = Date.now() + (j.expires_in || 3600) * 1000 - 60000;
      if (j.refresh_token) d.refresh = j.refresh_token;
      delete d.verifierare; delete d.state;
    });
  }

  // Tar emot ?code= efter inloggningen och städar adressen. Svarar med en text att visa, eller null.
  async function hanteraRetur() {
    const p = new URLSearchParams(location.search);
    if (!p.has('code') && !p.has('error')) return null;
    const d = las();
    history.replaceState(null, '', location.pathname + location.hash);
    if (p.get('error') || p.get('state') !== d.state || !d.verifierare) return 'Inloggningen avbröts. Försök igen.';
    try {
      await token({ grant_type: 'authorization_code', code: p.get('code'), redirect_uri: omdirigering(), client_id: d.klient, code_verifier: d.verifierare });
      return null;
    } catch (e) { return e.message; }
  }

  async function giltigNyckel() {
    const d = las();
    if (!d.refresh) return null;
    if (d.access && Date.now() < d.utgar) return d.access;
    try {
      await token({ grant_type: 'refresh_token', refresh_token: d.refresh, client_id: d.klient });
    } catch (e) {
      if (e.kod === 'invalid_grant') { loggaUt(); e.utloggad = true; e.message = 'Spotify-inloggningen har gått ut. Logga in igen.'; }
      throw e;
    }
    return las().access;
  }

  async function api(sokvag, metod, kropp) {
    const nyckel = await giltigNyckel();
    if (!nyckel) return null;
    const init = { method: metod || 'GET', headers: { Authorization: 'Bearer ' + nyckel } };
    if (kropp) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(kropp); }
    const res = await fetch(C().spotify + sokvag, init);
    if (res.status === 204) return null;
    const text = await res.text();
    let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) { /* inte JSON */ }
    if (res.ok) return j;
    const e = new Error('Spotify svarade ' + res.status);
    e.status = res.status;
    e.orsak = j && j.error && j.error.reason;
    if (res.status === 401) uppdatera((d) => { d.utgar = 0; });
    throw e;
  }

  // ---------- Vad spelas ----------
  function tolka(p) {
    if (!p || !p.item) return null;
    const t = p.item, alb = t.album || {};
    const bilder = (alb.images || []).slice().sort((a, b) => (a.width || 0) - (b.width || 0));
    const mellan = bilder.find((b) => (b.width || 0) >= 200) || bilder[bilder.length - 1] || {};
    return {
      id: t.id, spelar: !!p.is_playing, titel: t.name || '',
      artist: (t.artists || []).map((a) => a.name).join(', '),
      bild: mellan.url || '', langd: t.duration_ms || 0, position: p.progress_ms || 0,
      enhet: (p.device && p.device.name) || ''
    };
  }
  async function hamta() { return tolka(await api('/me/player')); }

  // ---------- Styrning ----------
  function felText(e) {
    if (e.status === 403 && e.orsak === 'PREMIUM_REQUIRED') return 'Styrning kräver Spotify Premium.';
    if (e.status === 404 || e.orsak === 'NO_ACTIVE_DEVICE') return 'Öppna Spotify-appen och starta en låt först.';
    if (e.status === 403) return 'Spotify tillät inte det just nu.';
    if (e.status === 429) return 'Spotify ber oss vänta en stund. Försök igen.';
    return 'Spotify svarade inte. Försök igen.';
  }

  async function spela() {
    try { await api('/me/player/play', 'PUT'); }
    catch (e) {
      if (e.status !== 404) throw e;
      // Ingen aktiv enhet: väck den senaste enheten som Spotify känner till
      const lista = await api('/me/player/devices');
      const enhet = lista && lista.devices && (lista.devices.find((d) => d.type === 'Smartphone') || lista.devices[0]);
      if (!enhet) throw e;
      await api('/me/player/play?device_id=' + encodeURIComponent(enhet.id), 'PUT');
    }
  }
  const pausa = () => api('/me/player/pause', 'PUT');
  const nasta = () => api('/me/player/next', 'POST');
  const forra = () => api('/me/player/previous', 'POST');
  const spola = (ms) => api('/me/player/seek?position_ms=' + Math.max(0, Math.round(ms)), 'PUT');

  return { loggaIn, loggaUt, hanteraRetur, inloggad, klient, omdirigering, hamta, tolka, spela, pausa, nasta, forra, spola, felText };
})();
