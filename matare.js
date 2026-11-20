// Nivåmätaren med fyra utseenden (skal). Rörelserna är animationer: Spotify ger ingen riktig ljudnivå.
// Valet sparas i kassett-matare. Allt byggs med DOM-anrop, aldrig med text från Spotify.
window.KassettMatare = (function () {
  const NYCKEL = 'kassett-matare';
  const SKAL = [
    { id: 'vu', namn: 'LEVEL', fot: ['LEFT', 'RIGHT'] },
    { id: 'eq', namn: 'GRAPHIC EQUALIZER', fot: null },
    { id: 'spektrum', namn: 'SPECTRUM ANALYZER', fot: null },
    { id: 'topp', namn: 'PEAK LEVEL METER', fot: null }
  ];
  const SVG = 'http://www.w3.org/2000/svg';

  function las() { try { const v = localStorage.getItem(NYCKEL); return SKAL.some((s) => s.id === v) ? v : 'vu'; } catch (e) { return 'vu'; } }
  function spara(v) { try { localStorage.setItem(NYCKEL, v); } catch (e) { /* avstängt */ } }

  function el(tagg, klass, foralder) {
    const e = document.createElement(tagg);
    if (klass) e.className = klass;
    if (foralder) foralder.appendChild(e);
    return e;
  }
  function svgEl(tagg, attr, foralder) {
    const e = document.createElementNS(SVG, tagg);
    Object.keys(attr).forEach((k) => e.setAttribute(k, attr[k]));
    if (foralder) foralder.appendChild(e);
    return e;
  }
  // Varje stapel får egen takt så att det ser levande ut
  function takt(e, i, namn) {
    e.style.setProperty('--namn', namn[i % namn.length]);
    e.style.setProperty('--tid', (0.6 + (i % 5) * 0.13).toFixed(2) + 's');
    e.style.setProperty('--fore', (-i * 0.12).toFixed(2) + 's');
  }

  // ---------- Analoga VU-mätare ----------
  function vuSkala(svg) {
    const cx = 90, cy = 128, r = 100;
    const pt = (a, rr) => { const t = a * Math.PI / 180; return [(cx + rr * Math.sin(t)).toFixed(1), (cy - rr * Math.cos(t)).toFixed(1)]; };
    const bage = (a1, a2, farg, bredd) => {
      const [x1, y1] = pt(a1, r), [x2, y2] = pt(a2, r);
      svgEl('path', { d: `M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`, fill: 'none', stroke: farg, 'stroke-width': bredd }, svg);
    };
    bage(-50, 18, '#2a2620', 2);
    bage(18, 50, '#c8402c', 5);
    for (let a = -45; a <= 45; a += 5) {
      const [x1, y1] = pt(a, r), [x2, y2] = pt(a, r + 4);
      svgEl('path', { d: `M${x1} ${y1}L${x2} ${y2}`, stroke: '#2a2620', 'stroke-width': 1 }, svg);
    }
    [[-50, '-20'], [-32, '10'], [-22, '7'], [-13, '5'], [-3, '3'], [9, '1'], [18, '0'], [27, '1'], [36, '2'], [46, '3']].forEach(([a, text], i) => {
      const farg = i > 6 ? '#c8402c' : '#2a2620';
      const [x1, y1] = pt(a, r), [x2, y2] = pt(a, r + 9), [tx, ty] = pt(a, r + 18);
      svgEl('path', { d: `M${x1} ${y1}L${x2} ${y2}`, stroke: farg, 'stroke-width': 2 }, svg);
      svgEl('text', { x: tx, y: Number(ty) + 3, 'font-size': 9, 'text-anchor': 'middle', fill: farg, 'font-family': 'Share Tech Mono, monospace' }, svg).textContent = text;
    });
    svgEl('text', { x: 90, y: 88, 'font-size': 20, 'text-anchor': 'middle', fill: '#2a2620', 'font-family': 'Share Tech Mono, monospace', 'font-weight': 700 }, svg).textContent = 'VU';
  }
  function ritaVu(yta) {
    const rad = el('span', 'vu-par', yta);
    ['nalL', 'nalR'].forEach((namn, i) => {
      const svg = svgEl('svg', { viewBox: '0 0 180 150', class: 'vu-matare', 'aria-hidden': 'true' }, rad);
      const defs = svgEl('defs', {}, svg);
      const g = svgEl('radialGradient', { id: 'ljus' + i, cx: '50%', cy: '100%', r: '110%' }, defs);
      svgEl('stop', { offset: '0', 'stop-color': '#fff1c2' }, g);
      svgEl('stop', { offset: '0.7', 'stop-color': '#f2d48a' }, g);
      svgEl('stop', { offset: '1', 'stop-color': '#d9b45e' }, g);
      svgEl('rect', { x: 1.5, y: 1.5, width: 177, height: 147, rx: 8, fill: `url(#ljus${i})`, stroke: '#0c0b0a', 'stroke-width': 3 }, svg);
      vuSkala(svg);
      const nal = svgEl('g', { class: 'nal' }, svg);
      nal.style.setProperty('--namn', namn);
      nal.style.setProperty('--tid', i ? '1.4s' : '1.6s');
      svgEl('line', { x1: 90, y1: 128, x2: 90, y2: 20, stroke: '#1a1714', 'stroke-width': 2 }, nal);
      svgEl('path', { d: 'M3 148 Q90 112 177 148 Z', fill: '#0c0b0a' }, svg);
      svgEl('rect', { x: 3, y: 3, width: 174, height: 70, rx: 6, fill: 'rgba(255,255,255,.22)' }, svg);
    });
  }

  // ---------- Grafisk equalizer ----------
  function ritaEq(yta) {
    const staplar = el('span', 'eq-staplar', yta);
    const etiketter = el('span', 'eq-hz', yta);
    ['32', '64', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'].forEach((hz, i) => {
      const kanal = el('span', 'stapel', staplar);
      takt(el('span', 'morker', kanal), i, ['eqD', 'eqA', 'eqB', 'eqC']);
      el('span', '', etiketter).textContent = hz;
    });
  }

  // ---------- Spektrumanalysator ----------
  function ritaSpektrum(yta) {
    const rad = el('span', 'spek-rad', yta);
    const skala = el('span', 'spek-db', rad);
    ['0', '-6', '-12', '-24', 'dB'].forEach((t) => { el('span', '', skala).textContent = t; });
    const staplar = el('span', 'spek-staplar', rad);
    for (let i = 0; i < 16; i++) takt(el('span', 'morker', el('span', 'stapel', staplar)), i * 7, ['eqA', 'eqB', 'eqC']);
    const hz = el('span', 'spek-hz', yta);
    ['60', '250', '1K', '4K', '16K Hz'].forEach((t) => { el('span', '', hz).textContent = t; });
  }

  // ---------- Däckets toppmätare ----------
  function ritaTopp(yta) {
    const rad = (kanal, namn, i) => {
      const r = el('span', 'topp-rad', yta);
      el('span', 'topp-kanal', r).textContent = kanal;
      const led = el('span', 'topp-led', r);
      const m = el('span', 'morker', led);
      m.style.setProperty('--namn', namn);
      m.style.setProperty('--tid', i ? '1.05s' : '1.2s');
    };
    rad('L', 'toppL', 0);
    const skala = el('span', 'topp-skala', yta);
    ['-30', '-20', '-10', '-6', '-3', '0', '+3', '+6', '+8'].forEach((t) => {
      const s = el('span', t.startsWith('+') ? 'rod' : '', skala); s.textContent = t;
    });
    rad('R', 'toppR', 1);
  }

  const RITA = { vu: ritaVu, eq: ritaEq, spektrum: ritaSpektrum, topp: ritaTopp };

  let aktuellt = las();
  function rita(niva, yta, namn) {
    const skal = SKAL.find((s) => s.id === aktuellt);
    SKAL.forEach((s) => niva.classList.toggle('skal-' + s.id, s.id === aktuellt));
    niva.dataset.skal = aktuellt;
    namn.textContent = skal.namn;
    yta.replaceChildren();
    RITA[aktuellt](yta);
    if (skal.fot) {
      const fot = el('span', 'matare-fot', yta);
      skal.fot.forEach((t) => { el('span', '', fot).textContent = t; });
    }
  }
  function valj(id) { if (RITA[id]) { aktuellt = id; spara(id); } return aktuellt; }
  function nasta() { const i = SKAL.findIndex((s) => s.id === aktuellt); return valj(SKAL[(i + 1) % SKAL.length].id); }

  return { rita, valj, nasta, aktuell: () => aktuellt, SKAL };
})();
