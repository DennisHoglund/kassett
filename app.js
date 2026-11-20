// Kassett – startar allt: klocka, inloggning, vad som spelas och tangenterna.
const VERSION = '1.2.0';

(function () {
  const $ = (id) => document.getElementById(id);
  const S = window.KassettSpotify;
  const CFG = window.KASSETT_CONFIG;
  const M = window.KassettMatare;

  let senaste = null, hamtadVid = 0, pollTimer = null;
  let visadId = null, ko = null, koFor = null, byter = false;
  const lugn = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Klocka ----------
  const p2 = (n) => String(n).padStart(2, '0');
  function ritaKlocka() {
    const nu = new Date();
    $('klocka').textContent = p2(nu.getHours()) + ':' + p2(nu.getMinutes());
    $('datum').textContent = nu.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '');
  }

  // ---------- Kassetten ----------
  function mmss(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + p2(s % 60); }
  function position() {
    if (!senaste) return 0;
    return Math.min(senaste.langd, senaste.position + (senaste.spelar ? Date.now() - hamtadVid : 0));
  }
  // Bandpacken: vänster rulle töms och höger fylls under låten (storlek i rem, efter area)
  function packStorlek(andel) { const min = 2.75, max = 6.75; return Math.sqrt(min * min + (max * max - min * min) * andel); }

  function ritaPosition() {
    const pos = position(), langd = senaste ? senaste.langd : 0, andel = langd ? pos / langd : 0;
    $('pos').textContent = mmss(pos);
    $('langd').textContent = mmss(langd);
    $('forlopp-fyll').style.width = (andel * 100).toFixed(2) + '%';
    const v = packStorlek(1 - andel), h = packStorlek(andel);
    $('pack-v').style.width = $('pack-v').style.height = v.toFixed(3) + 'rem';
    $('pack-h').style.width = $('pack-h').style.height = h.toFixed(3) + 'rem';
  }

  function ritaLat() {
    const t = senaste;
    document.body.classList.toggle('spelar', !!(t && t.spelar));
    $('spela').setAttribute('aria-label', t && t.spelar ? 'Pausa' : 'Spela');
    const titel = t ? t.titel : 'Inget spelas';
    $('titel').textContent = titel;
    $('titel').classList.toggle('mellan', titel.length > 12 && titel.length <= 20);
    $('titel').classList.toggle('liten', titel.length > 20);
    $('artist').textContent = t ? t.artist : 'Starta musik i Spotify';
    $('enhet').textContent = t && t.enhet ? t.enhet : 'Ingen enhet';
    $('enhet-lampa').classList.toggle('pa', !!(t && t.spelar));
    const bild = t && t.bild;
    if (bild && $('omslag').getAttribute('src') !== bild) $('omslag').src = bild;
    $('polaroid').hidden = !bild;
    $('tejp').hidden = !bild;
    ritaPosition();
  }

  // ---------- Sida B ----------
  function ritaSidaB() {
    $('b-titel').textContent = ko ? ko.titel : 'Inget i kön';
    $('b-artist').textContent = ko ? ko.artist : '';
    const bild = ko && ko.bild;
    if (bild && $('b-omslag').getAttribute('src') !== bild) $('b-omslag').src = bild;
    $('b-omslag').hidden = !bild;
  }
  async function hamtaKo() {
    const id = senaste && senaste.id;
    if (!id || koFor === id) return;
    koFor = id;
    try { ko = await S.hamtaKo(); } catch (e) { ko = null; koFor = null; }
    if (!byter) ritaSidaB();
  }

  // ---------- Låtbyte: kassetten matas ut och en ny glider in ----------
  function vantaRam() { return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); }
  async function bytKassett() {
    if (lugn()) { ritaLat(); ritaSidaB(); return; }
    byter = true;
    document.body.classList.add('byter');
    $('kassett').classList.add('ut');
    $('sida-b').classList.add('byter');
    await new Promise((r) => setTimeout(r, 460));
    $('kassett').classList.replace('ut', 'start');
    ritaLat();
    ritaSidaB();
    await vantaRam();
    $('kassett').classList.remove('start');
    $('sida-b').classList.remove('byter');
    await new Promise((r) => setTimeout(r, 600));
    document.body.classList.remove('byter');
    byter = false;
  }

  // ---------- Nivåmätare ----------
  function ritaMatare() {
    M.rita($('niva'), $('matare'), $('matare-namn'));
    document.querySelectorAll('input[name="skal"]').forEach((r) => { r.checked = r.value === M.aktuell(); });
  }

  // ---------- Meddelanden ----------
  function meddela(text, sekunder) {
    $('meddelande').textContent = text || '';
    clearTimeout(meddela.t);
    if (text && sekunder) meddela.t = setTimeout(() => { $('meddelande').textContent = ''; }, sekunder * 1000);
  }

  // ---------- Hämta ----------
  async function hamta() {
    if (!S.inloggad()) return;
    try {
      senaste = await S.hamta();
      hamtadVid = Date.now();
      const nyttId = senaste ? senaste.id : null;
      const nyLat = visadId && nyttId && nyttId !== visadId;
      visadId = nyttId;
      if (nyLat) { koFor = null; hamtaKo(); bytKassett(); }
      else if (!byter) { ritaLat(); hamtaKo(); }
      if ($('meddelande').dataset.natfel) { meddela(''); delete $('meddelande').dataset.natfel; }
    } catch (e) {
      if (e.utloggad) { senaste = null; ritaLat(); visaLucka(e.message); return; }
      meddela('Ingen kontakt med Spotify, försöker igen');
      $('meddelande').dataset.natfel = '1';
    }
  }
  function schemalagg() {
    clearTimeout(pollTimer);
    const sek = document.hidden ? CFG.intervall.vilar : CFG.intervall.spelar;
    pollTimer = setTimeout(async () => { await hamta(); schemalagg(); }, sek * 1000);
  }

  // ---------- Styrning ----------
  async function styr(vad, knapp) {
    if (!S.inloggad()) return;
    if (knapp) knapp.classList.add('nere');
    try {
      if (vad === 'spela') {
        if (senaste && senaste.spelar) await S.pausa(); else await S.spela();
        if (senaste) { senaste.position = position(); senaste.spelar = !senaste.spelar; hamtadVid = Date.now(); ritaLat(); }
      }
      if (vad === 'nasta') await S.nasta();
      if (vad === 'forra') await S.forra();
      meddela('');
    } catch (e) {
      meddela(S.felText(e), 6);
    } finally {
      if (knapp) setTimeout(() => knapp.classList.remove('nere'), 120);
      setTimeout(() => hamta(), 600);
    }
  }
  async function spolaTill(ev) {
    if (!senaste || !senaste.langd) return;
    const r = $('forlopp').getBoundingClientRect();
    const andel = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
    const ms = andel * senaste.langd;
    try {
      await S.spola(ms);
      senaste.position = ms; hamtadVid = Date.now(); ritaPosition();
    } catch (e) { meddela(S.felText(e), 6); }
  }

  // ---------- Luckan: inloggning och inställningar ----------
  function visaLucka(text) {
    const inne = S.inloggad();
    $('klient').value = S.klient();
    $('adress').textContent = S.omdirigering();
    $('logga-in').hidden = inne;
    $('logga-ut').hidden = !inne;
    $('stang').hidden = !inne;
    $('status').textContent = text || (inne ? 'Inloggad med Spotify.' : '');
    $('lucka').hidden = false;
  }
  function stangLucka() { if (S.inloggad()) $('lucka').hidden = true; }

  function koppla() {
    $('spela').addEventListener('click', (e) => styr('spela', e.currentTarget));
    $('nasta').addEventListener('click', (e) => styr('nasta', e.currentTarget));
    $('forra').addEventListener('click', (e) => styr('forra', e.currentTarget));
    $('forlopp').addEventListener('click', spolaTill);
    $('matare').addEventListener('click', () => { M.nasta(); ritaMatare(); });
    document.querySelectorAll('input[name="skal"]').forEach((r) => r.addEventListener('change', () => { M.valj(r.value); ritaMatare(); }));
    $('eject').addEventListener('click', () => visaLucka());
    $('stang').addEventListener('click', stangLucka);
    $('logga-in').addEventListener('click', async () => {
      $('status').textContent = 'Öppnar Spotify …';
      try { await S.loggaIn($('klient').value); } catch (e) { $('status').textContent = e.message; }
    });
    $('logga-ut').addEventListener('click', () => { S.loggaUt(); senaste = null; ko = null; koFor = null; visadId = null; ritaLat(); ritaSidaB(); visaLucka('Utloggad.'); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) hamta(); schemalagg(); });
  }

  async function starta() {
    $('version').textContent = VERSION;
    ritaKlocka();
    setInterval(ritaKlocka, 1000);
    setInterval(() => { if (senaste && senaste.spelar && !byter) ritaPosition(); }, 500);
    koppla();
    ritaMatare();
    ritaLat();
    const fel = await S.hanteraRetur();
    if (!S.inloggad()) { visaLucka(fel); return; }
    if (fel) meddela(fel, 6);
    await hamta();
    schemalagg();
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* fungerar ändå utan */ });
  }
  starta();
})();
