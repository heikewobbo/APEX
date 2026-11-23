/* APEX — stile RALLY: note da copilota, auto da rally, ricognizione, taratura sul proprio stile */
(function () {
  'use strict';
  const A = window.APEX, P = window.Pacenotes, $ = A.$, esc = A.esc;
  const ID = 'rally';
  const S = () => A.ss(ID);
  const save = () => A.saveSS(ID);

  // ---------- comandi vocali del copilota ----------
  const COMMANDS = [
    ['Curve a destra', ['destra_piena', 'destra_sei', 'destra_cinque', 'destra_quattro', 'destra_tre', 'destra_due', 'destra_uno', 'destra_tornante']],
    ['Curve a sinistra', ['sinistra_piena', 'sinistra_sei', 'sinistra_cinque', 'sinistra_quattro', 'sinistra_tre', 'sinistra_due', 'sinistra_uno', 'sinistra_tornante']],
    ['Dettagli curva', ['lunga', 'molto_lunga', 'stringe', 'apre', 'secca', 'e', 'incrocio']],
    ['Distanze', ['30', '40', '50', '60', '70', '80', '100', '120', '140', '150', '160', '180', '200', '250', '300', '350', '400', '450', '500', '600', '700', '800', '900', '1000']],
    ['Indicazioni', ['stai_destra', 'stai_sinistra', 'rotonda', 'prima_uscita', 'seconda_uscita', 'terza_uscita', 'quarta_uscita', 'quinta_uscita', 'sesta_uscita', 'ricalcolo', 'fine']],
    ['Ostacoli', ['attento', 'attento_attento', 'autovelox', 'tutor', 'buca', 'dosso', 'scivola', 'ponte', 'lavori']]
  ];
  const EXITS = ['prima_uscita', 'seconda_uscita', 'terza_uscita', 'quarta_uscita', 'quinta_uscita', 'sesta_uscita'];
  // parole che il pacchetto non ha: si usano clip già registrate dalla stessa voce
  const ALIASES = {
    autovelox: ['occhio'], tutor: ['occhio'], lavori: ['attento', 'stretta'], ricalcolo: ['aspetta'], rotonda: ['gira'],
    prima_uscita: ['_uno'], seconda_uscita: ['_due'], terza_uscita: ['_tre'], quarta_uscita: ['_quattro'], quinta_uscita: ['_cinque'], sesta_uscita: ['_sei']
  };

  // ---------- cartelli delle note ----------
  const GCOL = { piena: '#2bb3ff', 6: '#3ddc84', 5: '#b5e61d', 4: '#ffd400', 3: '#ff9f1a', 2: '#ff6a2b', 1: '#ff3b3b', tornante: '#ff3b3b', 90: '#ff3b3b' };
  const TURN = { piena: 14, 6: 24, 5: 38, 4: 52, 3: 66, 2: 82, 1: 105, 90: 90, tornante: 180 };
  const gkey = nt => nt.kind !== 'corner' ? null : (nt.mods.includes('secca') ? 90 : nt.grade);
  const colorOf = nt => nt.kind === 'corner' ? GCOL[gkey(nt)] : (nt.kind === 'nav' ? '#ffffff' : '#ff3b3b');
  function signSVG(nt) {
    const col = colorOf(nt);
    const frame = `<rect x="4" y="4" width="92" height="92" rx="16" fill="#0b0c0f" stroke="${col}" stroke-width="6"/>`;
    if (nt.kind !== 'corner') {
      const ch = nt.kind === 'finish' ? '⚑' : nt.kind === 'nav' ? (nt.icon || '↑') : '!';
      return `<svg class="sign" viewBox="0 0 100 100">${frame}<text x="50" y="68" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="52" fill="${col}">${ch}</text></svg>`;
    }
    const g = gkey(nt), th = TURN[g] * Math.PI / 180, right = nt.dir === 'destra';
    const pts = []; let x = g === 'tornante' ? 34 : 50 - Math.min(TURN[g], 90) / 90 * 16, y = 88, phi = -Math.PI / 2;
    const rr = g === 'tornante' ? 17 : g === 90 ? 3 : 30 - Math.min(TURN[g], 110) / 110 * 12;
    pts.push([x, y]); y -= g === 'tornante' ? 34 : 30; pts.push([x, y]);
    const cx = x + rr * Math.cos(phi + Math.PI / 2), cy = y + rr * Math.sin(phi + Math.PI / 2), a0 = phi - Math.PI / 2;
    for (let i = 1; i <= 24; i++) { const a = a0 + th * i / 24; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
    phi += th; const tail = g === 'tornante' ? 14 : 16;
    const ex = pts[pts.length - 1][0] + tail * Math.cos(phi), ey = pts[pts.length - 1][1] + tail * Math.sin(phi);
    pts.push([ex, ey]);
    const hx = ex + 10 * Math.cos(phi), hy = ey + 10 * Math.sin(phi);
    const lx = ex + 9 * Math.cos(phi + 2.2), ly = ey + 9 * Math.sin(phi + 2.2), rx = ex + 9 * Math.cos(phi - 2.2), ry = ey + 9 * Math.sin(phi - 2.2);
    const mx = v => right ? v : 100 - v;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + mx(p[0]).toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const head = `M${mx(hx).toFixed(1)} ${hy.toFixed(1)}L${mx(lx).toFixed(1)} ${ly.toFixed(1)}L${mx(rx).toFixed(1)} ${ry.toFixed(1)}Z`;
    const lab = g === 'tornante' ? '' : g === 90 ? '!' : g === 'piena' ? 'P' : String(g);
    const long = nt.mods.includes('lunga') || nt.mods.includes('molto_lunga');
    return `<svg class="sign" viewBox="0 0 100 100">${frame}<path d="${d}" fill="none" stroke="#fff" stroke-width="${long ? 11 : 8}" stroke-linecap="round" stroke-linejoin="round"/><path d="${head}" fill="#fff"/>` +
      (lab ? `<text x="${right ? 14 : 86}" y="88" text-anchor="${right ? 'start' : 'end'}" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="26" fill="${col}">${lab}</text>` : '') + `</svg>`;
  }
  const iconHTML = nt => `<div class="ni">${signSVG(nt)}</div>`;
  function manIcon(m) {
    if (m.type === 'arrive') return '<svg viewBox="0 0 48 48"><path d="M14 42V8M14 8h20l-4 7 4 7H14" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/></svg>';
    if (m.type === 'roundabout' || m.type === 'rotary') return `<svg viewBox="0 0 48 48"><circle cx="24" cy="20" r="9" fill="none" stroke="#fff" stroke-width="4"/><path d="M24 44V29" stroke="#fff" stroke-width="4" stroke-linecap="round"/><text x="24" y="25" text-anchor="middle" font-family="Barlow Condensed,sans-serif" font-weight="800" font-size="12" fill="#fff">${m.exit || ''}</text></svg>`;
    const ang = { straight: 0, 'slight right': 40, right: 90, 'sharp right': 130, 'slight left': -40, left: -90, 'sharp left': -130, uturn: -180 }[m.mod] || 0;
    const a = ang * Math.PI / 180, y1 = 22, L = ang === -180 ? 0 : 14, ex = 24 + Math.sin(a) * L, ey = y1 - Math.cos(a) * L;
    const path = ang === -180 ? 'M28 44V18a8 8 0 0 0-16 0v12' : `M24 44V${y1}L${ex.toFixed(1)} ${ey.toFixed(1)}`;
    const hx = ang === -180 ? 12 : ex, hy = ang === -180 ? 30 : ey, ha = ang === -180 ? Math.PI : a;
    const p = k => [hx + Math.sin(ha + k) * 7, hy - Math.cos(ha + k) * 7].map(v => v.toFixed(1)).join(' ');
    return `<svg viewBox="0 0 48 48"><path d="${path}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M${p(0)}L${p(2.3)}L${p(-2.3)}Z" fill="#fff"/></svg>`;
  }

  // ---------- note del percorso ----------
  let noteSeq = 1;
  const R = { base: null, notes: [], calls: [], labels: [], edited: false, idx: 0, said: -1, cc: null };
  // note "base" (si correggono e si salvano): curve calcolate + incroci/rotonde/bivi + arrivo
  function computeBase(cur) {
    const route = cur.route;
    let notes = cur.gen.notes.map(n => Object.assign({}, n, { mods: n.mods.slice(), junction: false }));
    const extra = [];
    if (S().nav) {
      for (const m of cur.man || []) {
        const t = m.type, mod = m.mod || '';
        if (t === 'arrive') continue;
        if (t === 'roundabout' || t === 'rotary' || t === 'roundabout turn') {
          const s1 = m.s + (m.len || 30);
          notes = notes.filter(n => n.endS < m.s - 10 || n.startS > s1 + 10);
          const ex = Math.max(1, Math.min(6, m.exit || 1));
          extra.push({ kind: 'nav', icon: '⟳', label: 'ROT ' + ex, startS: Math.max(0, m.s - 15), endS: s1, tokens: ['rotonda', EXITS[ex - 1]] });
          continue;
        }
        if (!/left|right/.test(mod) || /uturn/.test(mod)) continue;
        const left = /left/.test(mod);
        const near = notes.find(n => n.kind === 'corner' && n.startS - 30 <= m.s && n.endS + 30 >= m.s && (n.dir === 'sinistra') === left);
        if (near) { near.junction = true; continue; }
        if (['fork', 'off ramp', 'on ramp', 'merge', 'turn', 'end of road'].includes(t) || /slight/.test(mod))
          extra.push({ kind: 'nav', icon: left ? '↖' : '↗', label: left ? 'STAI SX' : 'STAI DX', startS: Math.max(0, m.s - 10), endS: m.s, tokens: [left ? 'stai_sinistra' : 'stai_destra'] });
      }
    }
    extra.push({ kind: 'finish', label: 'Arrivo', startS: Math.max(0, route.length - 40), endS: route.length, tokens: ['fine'] });
    notes = notes.concat(extra).sort((x, y) => x.startS - y.startS);
    notes.forEach(n => { n.id = noteSeq++; delete n.into; delete n.dist; });
    return notes;
  }
  // note finali = base + ostacoli + autovelox/tutor
  function buildNotes() {
    const cur = A.cur; if (!cur) return;
    const route = cur.route;
    const notes = R.base.map(n => Object.assign({}, n, n.mods ? { mods: n.mods.slice() } : {}, n.tokens ? { tokens: n.tokens.slice() } : {}));
    for (const o of A.obstacles) {
      const pr = A.projectOnRoute(o.lat, o.lon, route); if (pr.d > 25) continue;
      notes.push({ kind: 'obs', obsType: o.type, label: (A.OBS[o.type] || {}).label || 'Ostacolo', startS: Math.max(0, pr.s - 10), endS: pr.s, tokens: ((A.OBS[o.type] || {}).tokens || ['attento']).slice() });
    }
    for (const c of cur.camsOn || []) {
      const ty = c.type === 'tutor' ? 'tutor' : 'autovelox';
      notes.push({ kind: 'obs', obsType: ty, label: A.OBS[ty].label + (c.max ? ' ' + c.max : ''), startS: Math.max(0, c.s - 10), endS: c.s, tokens: A.OBS[ty].tokens.slice() });
    }
    notes.sort((x, y) => x.startS - y.startS);
    P.linkDistances(notes, route.length, cur.gen.cfg);
    R.notes = notes; R.calls = P.buildCalls(notes);
  }
  // le note stanno anche nel percorso (cur.extra.rally): cambiando stile e tornando non si perdono le correzioni
  function onRoute(cur) {
    if (R.forCur !== cur) {
      R.forCur = cur;
      const mine = cur.extra.rally, saved = cur.stage && cur.stageExtra && cur.stageExtra.rally;
      if (mine) { R.base = mine.base; R.edited = mine.edited; }
      else if (saved && saved.base) { R.base = JSON.parse(JSON.stringify(saved.base)); R.edited = true; }
      else { R.base = computeBase(cur); R.edited = false; }
      noteSeq = Math.max(noteSeq, ...R.base.map(n => (n.id || 0) + 1));
      cur.extra.rally = { base: R.base, edited: R.edited };
    }
    buildNotes(); drawNotes(); A.renderSheet();
    if (A.drive.on) resync(A.drive.estS());
  }
  function regenerate(fromSettings) {
    const cur = A.cur; if (!cur) return;
    if (R.edited) { if (fromSettings) A.toast('Questo percorso ha note corrette a mano: la modifica vale per i percorsi nuovi', 4000); }
    else if (!A.drive.on) { cur.gen = P.generate(cur.coords, genOptions()); R.base = computeBase(cur); cur.extra.rally = { base: R.base, edited: false }; }
    buildNotes(); drawNotes(); A.renderSheet();
  }
  const genOptions = () => ({ scale: S().scale, callFlat: S().flat });

  function drawNotes() {
    const cur = A.cur; if (!cur) return;
    const route = cur.route;
    A.mapReady(() => {
      const src = A.map.getSource('rally-corners');
      if (src) src.setData(A.fc(R.notes.filter(n => n.kind === 'corner').map(n => A.lineF(route.latlon.slice(n.i0, n.i1 + 1), { c: colorOf(n) }))));
      R.labels.forEach(m => m.remove()); R.labels = [];
      for (const nt of R.notes) {
        const at = A.pointAtS(route, nt.startS).ll;
        const txt = nt.kind === 'corner' ? P.shortLabel(nt) + (nt.mods.some(m => /lunga/.test(m)) ? ' L' : '') : nt.kind === 'obs' ? A.OBS[nt.obsType].ch : nt.kind === 'finish' ? 'FINE' : nt.label;
        const m = A.marker(`<span style="background:${colorOf(nt)}">${esc(txt)}</span>`, 'nlabel', [at[1], at[0]]);
        m._s = nt.startS; R.labels.push(m);
      }
      labelVis();
    });
  }
  function labelVis() { $('map').classList.toggle('show-labels', A.map.getZoom() >= 13.5); }
  function clearNotes() {
    R.labels.forEach(m => m.remove()); R.labels = []; R.notes = []; R.calls = []; R.base = null; R.forCur = null;
    const src = A.map.getSource && A.map.getSource('rally-corners'); if (src) src.setData(A.fc([]));
  }

  // testi delle chiamate
  function callTitle(c) { return c.notes.map(n => n.kind === 'corner' ? P.tokensText(P.noteTokens(n)) : n.kind === 'obs' ? n.label : n.kind === 'finish' ? 'Fine' : P.tokensText(n.tokens)).join(' e ') + (c.notes[c.notes.length - 1].dist && S().dist ? ' · ' + c.notes[c.notes.length - 1].dist : ''); }
  function callShort(c) {
    const parts = c.notes.map(n => n.kind === 'corner' ? P.shortLabel(n) + (n.mods.some(m => /lunga/.test(m)) ? ' L' : '') + (n.mods.includes('stringe') ? ' ↘' : '') : n.kind === 'finish' ? 'FINE' : n.label);
    const last = c.notes[c.notes.length - 1];
    return parts.join(' + ') + (last.dist && S().dist ? ' · ' + last.dist : '');
  }
  const callTokens = c => S().dist ? c.tokens : c.tokens.filter(t => !/^\d+$/.test(t));

  // ---------- foglio note (pianificazione) ----------
  function renderSheet(box, cur) {
    const head = `<div class="rnotehead"><span>${R.edited ? (cur.stage ? 'Note corrette' : 'Note corrette, non salvate') : 'Note calcolate'}</span><span>${R.notes.filter(n => n.kind === 'corner').length} curve</span></div>`;
    box.innerHTML = head + `<ol class="notelist">${R.calls.map(c => `<li data-c="${c.id}">${iconHTML(c.notes[0])}<div class="nt">${esc(callTitle(c))}</div><div class="nm">${A.fmtKm(c.startS)}</div>${c.notes.some(n => n.id) ? `<button class="edit" data-e="${c.id}" aria-label="Correggi nota"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg></button>` : '<span></span>'}</li>`).join('')}</ol>`;
  }
  document.addEventListener('click', e => {
    if (!A.style || A.style.id !== ID) return;
    const list = e.target.closest('#sheetExtra .notelist'); if (!list) return;
    const ed = e.target.closest('.edit');
    if (ed) { const c = R.calls[+ed.dataset.e]; const n = c.notes.find(x => x.id && x.kind === 'corner') || c.notes.find(x => x.id); if (n) editor.open(n.id, c); return; }
    const li = e.target.closest('li'); if (!li) return;
    const c = R.calls[+li.dataset.c], at = A.pointAtS(A.cur.route, c.startS + 20).ll;
    A.cam.follow(false); A.map.easeTo({ center: [at[1], at[0]], zoom: 16, duration: 500 });
    A.voice.unlock(); A.voice.say(callTokens(c));
  });

  // ---------- ricognizione: correggere le note ----------
  const GRADES = ['piena', 6, 5, 4, 3, 2, 1, 90, 'tornante'];
  const MODS = [['lunga', 'Lunga'], ['molto_lunga', 'Molto lunga'], ['stringe', 'Stringe'], ['apre', 'Apre'], ['junction', 'Incrocio']];
  const editor = {
    open(id, call, isNew = false) {
      const n = R.base.find(x => x.id === id); if (!n) return;
      Object.assign(this, { id, isNew, call: call || null, draft: JSON.parse(JSON.stringify(n)) });
      this.render(); $('noteEd').hidden = false;
    },
    addAt(s) {
      const route = A.cur.route;
      const turn = A.angDiff(A.routeBearing(route, s + 25), A.routeBearing(route, s - 15));
      const a = A.pointAtS(route, Math.max(0, s - 5)).i, b = A.pointAtS(route, Math.min(route.length, s + 30)).i;
      const n = { kind: 'corner', dir: turn >= 0 ? 'destra' : 'sinistra', grade: 4, mods: [], junction: false, startS: Math.max(0, s - 5), endS: Math.min(route.length, s + 30), apexS: s, i0: a, i1: Math.max(a + 1, b), radius: 0, angle: Math.round(Math.abs(turn)), manual: true, id: noteSeq++ };
      R.base.push(n); R.base.sort((x, y) => x.startS - y.startS);
      this.open(n.id, null, true);
    },
    render() {
      const d = this.draft, corner = d.kind === 'corner', g = corner ? gkey(d) : null;
      const sib = this.call ? this.call.notes.filter(x => x.id) : [];
      $('edPick').innerHTML = sib.length > 1 ? sib.map(x => `<button data-id="${x.id}" class="${x.id === d.id ? 'on' : ''}">${esc(x.kind === 'corner' ? P.shortLabel(x) : x.label)}</button>`).join('') : '';
      $('edPick').hidden = sib.length < 2; $('edCorner').hidden = !corner;
      if (corner) {
        $('edDir').innerHTML = ['sinistra', 'destra'].map(v => `<button data-d="${v}" class="${d.dir === v ? 'on' : ''}">${v === 'sinistra' ? 'Sinistra' : 'Destra'}</button>`).join('');
        $('edGrade').innerHTML = GRADES.map(v => { const nt = { kind: 'corner', dir: d.dir, grade: v === 90 ? 2 : v, mods: v === 90 ? ['secca'] : [] }; return `<button data-g="${v}" class="${String(g) === String(v) ? 'on' : ''}">${iconHTML(nt)}<span>${v === 'piena' ? 'Piena' : v === 'tornante' ? 'Tornante' : v}</span></button>`; }).join('');
        $('edMods').innerHTML = MODS.map(([k, l]) => `<button data-m="${k}" class="${(k === 'junction' ? d.junction : d.mods.includes(k)) ? 'on' : ''}">${l}</button>`).join('');
      }
      $('edPrev').innerHTML = `${iconHTML(d)}<b>${esc(corner ? P.tokensText(P.noteTokens(d)) : d.label || '')}</b>`;
      $('edTitle').textContent = this.isNew ? 'Nuova curva' : 'Correggi nota';
    },
    commit() { const i = R.base.findIndex(x => x.id === this.id); if (i >= 0) R.base[i] = this.draft; this.close(true); changed(); },
    remove() { R.base = R.base.filter(x => x.id !== this.id); this.close(true); changed(); A.toast('Nota eliminata'); },
    close(keep) { if (!keep && this.isNew) R.base = R.base.filter(x => x.id !== this.id); $('noteEd').hidden = true; this.id = null; }
  };
  function changed() {
    R.edited = true;
    if (A.cur) A.cur.extra.rally = { base: R.base, edited: true };
    buildNotes(); drawNotes(); A.renderSheet();
    if (A.drive.on) resync(A.drive.estS());
    if (A.cur && A.cur.stage) A.stages.save(A.cur.stageName, true);
  }
  function bindEditor() {
    $('noteEd').addEventListener('click', e => {
      if (e.target === $('noteEd')) return editor.close();
      const b = e.target.closest('button'); if (!b) return;
      const d = editor.draft;
      if (b.dataset.id) return editor.open(+b.dataset.id, editor.call);
      if (b.dataset.d) d.dir = b.dataset.d;
      if (b.dataset.g) {
        const v = b.dataset.g;
        d.mods = d.mods.filter(m => m !== 'secca');
        if (v === '90') { d.grade = 2; d.mods.push('secca'); } else d.grade = /^\d$/.test(v) ? +v : v;
        if (d.grade === 'tornante' || v === '90') d.mods = d.mods.filter(m => !/lunga/.test(m));
      }
      if (b.dataset.m) {
        const k = b.dataset.m;
        if (k === 'junction') d.junction = !d.junction;
        else if (d.mods.includes(k)) d.mods = d.mods.filter(m => m !== k);
        else {
          const excl = { lunga: 'molto_lunga', molto_lunga: 'lunga', stringe: 'apre', apre: 'stringe' };
          d.mods = d.mods.filter(m => m !== excl[k]); d.mods.push(k);
          const order = ['secca', 'lunga', 'molto_lunga', 'stringe', 'apre']; d.mods.sort((x, y) => order.indexOf(x) - order.indexOf(y));
        }
      }
      if (b.id === 'edPlay') { A.voice.unlock(); A.voice.say(d.kind === 'corner' ? P.noteTokens(d) : d.tokens || []); return; }
      if (b.id === 'edDel') return editor.remove();
      if (b.id === 'edOk') return editor.commit();
      if (b.id === 'edClose') return editor.close();
      editor.render();
    });
  }

  // ---------- auto: disegnate o foto personali ----------
  const customCars = new Map();
  async function loadCustomCars() {
    try {
      const all = await A.db.getAll('cars');
      customCars.forEach(c => { c.top && URL.revokeObjectURL(c.top); c.rear && URL.revokeObjectURL(c.rear); });
      customCars.clear();
      for (const [id, c] of all) customCars.set(id, { name: c.name, top: c.top && URL.createObjectURL(new Blob([c.top.buf], { type: c.top.type })), rear: c.rear && URL.createObjectURL(new Blob([c.rear.buf], { type: c.rear.type })) });
    } catch { /* niente */ }
    if (S().car.startsWith('x:') && !customCars.has(S().car)) { S().car = 'rally2'; save(); }
    A.vehicle.redraw();
  }
  async function importCars(files) {
    const found = new Map();
    const add = (name, buf) => {
      const m = name.split('/').pop().match(/^(.+?)__(top|rear|alto|dietro)\.(png|webp|jpe?g)$/i); if (!m) return;
      const id = 'x:' + m[1].toLowerCase(), view = /top|alto/i.test(m[2]) ? 'top' : 'rear';
      const type = /png/i.test(m[3]) ? 'image/png' : /webp/i.test(m[3]) ? 'image/webp' : 'image/jpeg';
      const c = found.get(id) || { name: m[1].replace(/_/g, ' ') }; c[view] = { buf, type }; found.set(id, c);
    };
    for (const f of files) {
      if (/\.zip$/i.test(f.name)) { const z = await JSZip.loadAsync(f); for (const e of Object.values(z.files)) if (!e.dir && !/__MACOSX/.test(e.name)) add(e.name, await e.async('arraybuffer')); }
      else add(f.name, await f.arrayBuffer());
    }
    if (!found.size) throw new Error('nessuna immagine con nome "Auto__top.png" o "Auto__rear.png"');
    const old = await A.db.getAll('cars');
    for (const [id, c] of found) await A.db.put('cars', id, Object.assign(old.get(id) || {}, c));
    A.keepData(); await loadCustomCars();
    return found.size;
  }
  const carInfo = () => customCars.get(S().car) || null;
  function carView(want) {
    if (want !== 'rear') return 'top';
    const c = carInfo(), hasTop = !c || !!c.top, hasRear = !c || !!c.rear;
    if (S().car3d === 'flat') return hasTop ? 'flat' : 'rear';
    return hasRear ? 'rear' : 'flat';
  }
  function carHTML(view) {
    const c = carInfo();
    if (c) {
      if (view === 'rear' && c.rear) return `<img class="car" src="${c.rear}" alt="">`;
      if (c.top) return `<img class="car" src="${c.top}" alt="">`;
      return view === 'rear' ? Cars.rear('rally2', S().livery) : Cars.top('rally2', S().livery);
    }
    return view === 'rear' ? Cars.rear(S().car, S().livery) : Cars.top(S().car, S().livery);
  }

  // ---------- taratura sul tuo modo di guidare ----------
  const A_REF = 4.0;
  const calib = {
    samples: [],
    async load() { try { this.samples = (await A.db.get('calib', 'samples')) || []; } catch { this.samples = []; } },
    add(x) { x.t = Date.now(); this.samples.push(x); if (this.samples.length > 3000) this.samples.splice(0, this.samples.length - 3000); A.db.put('calib', 'samples', this.samples).catch(() => {}); },
    analyze() {
      const ok = this.samples.filter(x => x.R > 0 && x.R <= 150 && x.v >= 4), per = {};
      for (const x of ok) (per[x.g] = per[x.g] || []).push(x.v * 3.6);
      if (ok.length < 12) return { n: ok.length, per };
      const acc = ok.map(x => x.v * x.v / x.R).sort((a, b) => a - b), a = acc[Math.floor(acc.length * 0.7)];
      return { n: ok.length, a, scale: Math.round(Math.max(0.7, Math.min(1.4, A_REF / a)) * 20) / 20, per };
    }
  };
  const scaleName = v => v < 0.95 ? 'aggressiva' : v > 1.05 ? 'prudente' : 'normale';
  function learn(d) {
    if (d.sim || !S().learn || !A.drive.on) return;
    if (d.d > 25) { R.cc = null; return; }
    if (R.cc && d.s > R.cc.note.endS + 10) { const n = R.cc.note; if (R.cc.vmin > 4 && n.radius && !n.manual) calib.add({ R: n.radius, g: String(gkey(n)), a: n.angle, v: R.cc.vmin }); R.cc = null; }
    if (!R.cc) { const n = R.notes.find(x => x.kind === 'corner' && d.s >= x.startS - 10 && d.s <= x.endS + 10); if (n) R.cc = { note: n, vmin: d.v }; }
    else R.cc.vmin = Math.min(R.cc.vmin, d.v);
  }

  // ---------- guida: chiamate e schermata ----------
  function resync(s) { R.idx = R.calls.findIndex(c => c.startS > s - 5); if (R.idx < 0) R.idx = R.calls.length; }
  function onTick(t) {
    if (!R.calls.length) return;
    const s = t.s, v = t.v, calls = R.calls;
    while (R.idx < calls.length && calls[R.idx].startS < s - 15) R.idx++;
    if (!A.voice.speaking && R.idx < calls.length) {
      const c = calls[R.idx];
      if (c.startS - s <= Math.max(55, v * S().lead)) {
        R.said = R.idx; R.idx++;
        A.voice.say(callTokens(c));
        const card = $('callCard'); card.classList.add('pulse'); setTimeout(() => card.classList.remove('pulse'), 180);
      }
    }
    render(t);
  }
  function render(t) {
    const s = t.s, calls = R.calls;
    let k = calls.findIndex(c => c.notes[c.notes.length - 1].endS > s - 5); if (k < 0) k = calls.length - 1;
    const c = calls[k];
    if (c) {
      $('dIcon').innerHTML = signSVG(c.notes[0]); $('dText').textContent = callTitle(c);
      const d = c.startS - s;
      $('dDist').textContent = d > 5 ? 'tra ' + (d >= 1000 ? A.fmtKm(d) : Math.round(d / 10) * 10 + ' m') : 'ora';
      $('callCard').classList.toggle('said', k <= R.said);
    }
    $('dNext').innerHTML = calls.slice(k + 1, k + 3).map(n => `<div>${iconHTML(n.notes[0])}<span>${esc(callShort(n))}</span><small>${Math.round((n.startS - s) / 10) * 10} m</small></div>`).join('');
    $('dSpd').textContent = t.kmh; $('dSpdBox').classList.toggle('over', t.over);
    $('dLimit').hidden = !t.limit; if (t.limit) $('dLimitV').textContent = t.limit;
    $('dRem').textContent = A.fmtKm(t.rem); $('dEta').textContent = 'arrivo ' + A.clock(t.eta);
    const nm = t.next; $('navBar').hidden = !nm;
    if (nm) {
      const d = nm.s - s;
      $('nvIcon').innerHTML = manIcon(nm); $('nvDist').textContent = A.fmtDist(d);
      $('nvText').innerHTML = esc(A.cap(nm.text)) + (nm.name ? ` <em>${/rotonda|uscita/.test(nm.text) ? 'verso' : 'in'} ${esc(nm.name)}</em>` : '');
    }
    for (const m of R.labels) m.getElement().classList.toggle('near', m._s > s - 10 && m._s < s + 450);
  }
  const HUD = `
    <section class="rdrive">
      <div class="navbar" id="navBar" hidden><div class="nvicon" id="nvIcon"></div><b id="nvDist"></b><span id="nvText"></span></div>
      <div class="callcard" id="callCard"><div class="cicon" id="dIcon"></div><div class="cbody"><div class="ctext" id="dText">Pronti</div><div class="cdist" id="dDist"></div></div></div>
      <div class="nextrow" id="dNext"></div>
    </section>
    <section class="dbar">
      <div class="spd" id="dSpdBox"><b id="dSpd">0</b><span>km/h</span></div>
      <div class="limit" id="dLimit" hidden><span id="dLimitV"></span></div>
      <div class="rem"><b id="dRem">–</b><span><span id="dEta"></span><span id="dMode"></span></span></div>
      <button id="btnRepeat" class="btn ghost small">Ripeti</button>
      <button id="btnStop" class="btn stop small">Stop</button>
    </section>`;
  const EDITOR = `
    <div id="noteEd" class="modal" hidden><div class="panel ed">
      <header><h2 id="edTitle">Correggi nota</h2><button id="edClose" class="iconbtn" aria-label="Chiudi"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
      <div id="edPick" class="seg"></div><div id="edPrev" class="edprev"></div>
      <div id="edCorner"><div id="edDir" class="seg"></div><div id="edGrade" class="gradegrid"></div><div id="edMods" class="modgrid"></div></div>
      <div class="edactions three"><button id="edPlay" class="btn ghost">Ascolta</button><button id="edDel" class="btn ghost danger">Elimina</button><button id="edOk" class="btn go">Fatto</button></div>
    </div></div>`;

  // ---------- impostazioni dello stile ----------
  function settingsHTML() {
    const s = S();
    return `
      <h3>La tua auto</h3>
      <div id="rCars" class="cars"></div>
      <div id="rLiv" class="swatches"></div>
      <div class="row"><label class="btn ghost small filebtn">Carica foto auto (.zip)<input id="rInCars" type="file" accept=".zip,application/zip,image/*" multiple></label></div>
      <p class="hint">Le foto restano solo su questo telefono. Nomi dei file: Nome__top.png (dall'alto, muso in su) e Nome__rear.png (da dietro).</p>
      <label class="select">Vista in guida<select id="rView"><option value="3d">3D, da dietro l'auto</option><option value="2d">2D dall'alto, direzione in su</option></select></label>
      <label class="select">Auto nella vista 3D<select id="rCar3d"><option value="flat">Vista dall'alto, appoggiata sulla strada</option><option value="rear">Vista da dietro</option></select></label>

      <h3>Voce del copilota</h3>
      <p id="rVoiceStatus" class="muted"></p>
      <div class="row"><label class="btn ghost small filebtn">Carica voci (.zip)<input id="rInVoices" type="file" accept=".zip,application/zip,audio/*" multiple></label><button id="rTest" class="btn ghost small">Prova</button></div>
      <details class="cmds"><summary>Comandi vocali <span id="rCmdMissing" class="muted"></span></summary>
        <p class="hint">▶ per ascoltare, File per sostituire con un audio tuo, Registra per dirlo tu col microfono.</p><div id="rCmdList"></div></details>

      <h3>Chiamate</h3>
      <label class="slider">Anticipo <output id="rOLead"></output><input id="rLead" type="range" min="2" max="9" step="0.5" value="${s.lead}"></label>
      <label class="slider">Taratura curve <output id="rOScale"></output><input id="rScale" type="range" min="0.7" max="1.4" step="0.05" value="${s.scale}"></label>
      <p class="hint">Verso destra i numeri scendono (note più prudenti), verso sinistra salgono.</p>
      <label class="toggle"><input id="rFlat" type="checkbox" ${s.flat ? 'checked' : ''}><span>Chiama le "piena"</span></label>
      <label class="toggle"><input id="rDist" type="checkbox" ${s.dist ? 'checked' : ''}><span>Chiama le distanze</span></label>
      <label class="toggle"><input id="rNav" type="checkbox" ${s.nav ? 'checked' : ''}><span>Note a incroci, rotonde e bivi</span></label>

      <h3>Taratura sul tuo stile</h3>
      <label class="toggle"><input id="rLearn" type="checkbox" ${s.learn ? 'checked' : ''}><span>Registra la velocità in curva mentre guidi</span></label>
      <p id="rCalibStatus" class="muted"></p><div id="rCalibTable" class="calib"></div>
      <div class="row"><button id="rCalibApply" class="btn ghost small">Applica taratura</button><button id="rCalibReset" class="btn ghost small">Azzera dati</button></div>`;
  }
  function bindSettings(box) {
    const s = S();
    const upd = () => { $('rOLead').textContent = String(s.lead).replace('.', ',') + ' s'; $('rOScale').textContent = scaleName(s.scale); save(); };
    $('rView').value = s.view; $('rCar3d').value = s.car3d;
    $('rView').onchange = () => { s.view = $('rView').value; save(); A.vehicle.redraw(); };
    $('rCar3d').onchange = () => { s.car3d = $('rCar3d').value; save(); A.vehicle.redraw(); };
    $('rLead').oninput = () => { s.lead = +$('rLead').value; upd(); };
    $('rScale').oninput = () => { s.scale = +$('rScale').value; upd(); };
    $('rScale').onchange = () => { regenerate(true); renderCalib(); };
    $('rFlat').onchange = () => { s.flat = $('rFlat').checked; save(); regenerate(true); };
    $('rDist').onchange = () => { s.dist = $('rDist').checked; save(); A.renderSheet(); };
    $('rNav').onchange = () => { s.nav = $('rNav').checked; save(); if (A.cur && !R.edited) { R.base = computeBase(A.cur); A.cur.extra.rally = { base: R.base, edited: false }; buildNotes(); drawNotes(); A.renderSheet(); } };
    $('rLearn').onchange = () => { s.learn = $('rLearn').checked; save(); };
    $('rInCars').onchange = async e => { const f = [...e.target.files]; if (!f.length) return; try { const n = await importCars(f); A.toast(n + (n === 1 ? ' auto caricata' : ' auto caricate')); renderCars(); } catch (err) { A.toast('Non sono riuscito a leggere le auto: ' + err.message, 6000); } e.target.value = ''; };
    $('rInVoices').onchange = async e => { const f = [...e.target.files]; if (!f.length) return; $('rVoiceStatus').textContent = 'Carico le voci…'; try { const n = await A.voice.importFiles(f); A.toast(n + ' clip caricate'); A.voice.unlock(); } catch (err) { A.toast('Non sono riuscito a leggere le voci: ' + err.message, 5000); } e.target.value = ''; };
    $('rTest').onclick = () => { A.voice.unlock(); A.voice.say(['destra_tre', 'lunga', 'e', 'sinistra_quattro', 'stringe', '150']); };
    $('rCars').onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; s.car = b.dataset.m; save(); renderCars(); A.vehicle.redraw(); };
    $('rLiv').onclick = e => { const b = e.target.closest('[data-l]'); if (!b) return; s.livery = b.dataset.l; save(); renderCars(); A.vehicle.redraw(); };
    $('rCalibApply').onclick = () => { const r = calib.analyze(); if (r.scale == null) return; s.scale = r.scale; $('rScale').value = r.scale; upd(); regenerate(true); renderCalib(); A.toast('Taratura applicata: ' + scaleName(r.scale)); };
    $('rCalibReset').onclick = e => { const b = e.currentTarget; if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = 'Conferma'; return; } b.classList.remove('confirm'); b.textContent = 'Azzera dati'; calib.samples = []; A.db.put('calib', 'samples', []).catch(() => {}); renderCalib(); };
    upd(); renderCars(); renderCommands(); renderCalib();
  }
  function renderCars() {
    const box = $('rCars'); if (!box) return;
    const s = S();
    box.innerHTML = Cars.MODELS.map(m => `<button class="carbtn ${m.id === s.car ? 'on' : ''}" data-m="${m.id}"><div class="cv">${Cars.rear(m.id, s.livery)}</div><span>${m.name}</span></button>`)
      .concat([...customCars].map(([id, c]) => `<button class="carbtn ${id === s.car ? 'on' : ''}" data-m="${esc(id)}"><div class="cv"><img src="${c.top || c.rear}" alt=""></div><span>${esc(c.name)}</span></button>`)).join('');
    $('rLiv').innerHTML = Cars.LIVERIES.map(l => `<button class="sw ${l.id === s.livery ? 'on' : ''}" data-l="${l.id}" aria-label="${l.name}" style="--a:${l.main};--b:${l.acc}"></button>`).join('');
    $('rLiv').hidden = !!carInfo();
  }
  function renderCommands() {
    const box = $('rCmdList'); if (!box) return;
    let miss = 0;
    box.innerHTML = COMMANDS.map(([group, toks]) => `<div class="cmdgroup"><h4>${group}</h4>${toks.map(t => {
      const ok = A.voice.has(t), al = !ok && A.voice.aliasOf(t); if (!ok && !al) miss++;
      const st = ok ? 'voce' : al ? 'dice: ' + al.map(a => P.tokenText(a).trim()).join(' ') : 'sintesi';
      return `<div class="cmd ${ok ? 'ok' : al ? 'alias' : 'miss'}" data-t="${t}"><span class="cn">${esc(P.tokenText(t))}</span><span class="cs">${esc(st)}</span>
        <button class="cb" data-act="play" aria-label="Ascolta">▶</button><label class="cb">File<input type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg" data-act="file"></label><button class="cb rec" data-act="rec">Registra</button></div>`;
    }).join('')}</div>`).join('');
    $('rCmdMissing').textContent = miss ? `${miss} senza voce (li legge la sintesi)` : 'tutti con la voce del copilota';
    $('rVoiceStatus').textContent = A.voice.count ? `${A.voice.count} clip caricate: chiamate con la voce del copilota.` : 'Nessuna voce caricata: uso la sintesi vocale del telefono.';
    box.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const t = b.closest('.cmd').dataset.t;
      if (b.dataset.act === 'play') { A.voice.unlock(); A.voice.say([t]); return; }
      if (b.dataset.act === 'rec') {
        if (rec && rec.token === t) { rec.r.stop(); return; } if (rec) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true }), r = new MediaRecorder(stream), chunks = [];
          rec = { r, token: t }; b.textContent = 'Stop'; b.classList.add('on');
          r.ondataavailable = ev => chunks.push(ev.data);
          r.onstop = async () => { stream.getTracks().forEach(x => x.stop()); const buf = await new Blob(chunks, { type: r.mimeType }).arrayBuffer(); rec = null; A.voice.unlock(); await A.voice.setClip(t, buf); A.toast('Registrato: ' + P.tokenText(t)); A.voice.say([t]); };
          r.start();
        } catch { rec = null; A.toast('Microfono non disponibile'); }
      }
    };
    box.onchange = async e => {
      const inp = e.target; if (inp.dataset.act !== 'file' || !inp.files[0]) return;
      const t = inp.closest('.cmd').dataset.t;
      try { A.voice.unlock(); await A.voice.setClip(t, await inp.files[0].arrayBuffer()); A.toast('Sostituito: ' + P.tokenText(t)); A.voice.say([t]); } catch { A.toast('File audio non valido'); }
    };
  }
  let rec = null;
  function renderCalib() {
    if (!$('rCalibStatus')) return;
    const r = calib.analyze(), s = S();
    $('rCalibStatus').textContent = r.scale == null ? `Curve registrate: ${r.n}. Ne servono almeno 12, guidando col GPS (la simulazione non conta).`
      : `Su ${r.n} curve la taratura adatta a te è "${scaleName(r.scale)}" (${String(r.scale).replace('.', ',')}). Ora è "${scaleName(s.scale)}".`;
    $('rCalibTable').innerHTML = ['piena', '6', '5', '4', '3', '2', '1', '90', 'tornante'].filter(k => r.per[k]).map(k => { const v = r.per[k]; return `<div><span>${k === 'piena' ? 'Piena' : k === 'tornante' ? 'Tornante' : k}</span><b>${Math.round(v.reduce((a, b) => a + b, 0) / v.length)} km/h</b><small>${v.length} curve</small></div>`; }).join('');
    $('rCalibApply').disabled = r.scale == null || r.scale === s.scale;
  }

  // ---------- colori della mappa: asfalto di notte ----------
  function restyle(map) {
    for (const l of map.getStyle().layers) {
      const id = l.id, sl = l['source-layer'] || '', key = id + ' ' + sl;
      try {
        if (l.type === 'background') map.setPaintProperty(id, 'background-color', '#15171b');
        else if (l.type === 'fill') {
          let c = '#1c1f25';
          if (/water|ocean|lake/.test(key)) c = '#14263a';
          else if (/park|wood|grass|forest|landcover|natural|meadow|scrub|wetland|farm|cemetery/.test(key)) c = '#18241d';
          else if (/building/.test(key)) c = '#262a31';
          if (l.paint && l.paint['fill-pattern'] !== undefined) map.setPaintProperty(id, 'fill-pattern', undefined);
          map.setPaintProperty(id, 'fill-color', c); map.setPaintProperty(id, 'fill-outline-color', c);
        }
        else if (l.type === 'fill-extrusion') { map.setPaintProperty(id, 'fill-extrusion-color', '#2a2e35'); map.setPaintProperty(id, 'fill-extrusion-opacity', 0.7); }
        else if (l.type === 'line') {
          if (/boundary|admin/.test(key)) map.setLayoutProperty(id, 'visibility', 'none');
          else if (/water|river|stream|canal/.test(key)) map.setPaintProperty(id, 'line-color', '#1d3550');
          else if (/casing/.test(id)) map.setPaintProperty(id, 'line-color', '#0b0c0f');
          else if (/motorway|trunk/.test(id)) map.setPaintProperty(id, 'line-color', '#c9a227');
          else if (/primary|secondary/.test(id)) map.setPaintProperty(id, 'line-color', '#8d9096');
          else if (/rail|transit|ferry/.test(key)) map.setPaintProperty(id, 'line-color', '#3b3f46');
          else if (/path|track|pedestrian|footway|cycle|steps/.test(id)) map.setPaintProperty(id, 'line-color', '#3a3e45');
          else if (sl === 'transportation' || /road|street|bridge|tunnel|highway/.test(id)) map.setPaintProperty(id, 'line-color', '#5d6168');
        }
        else if (l.type === 'symbol') {
          if (sl === 'poi' || /poi/.test(id)) { map.setLayoutProperty(id, 'visibility', 'none'); continue; }
          if (l.layout && l.layout['text-field'] !== undefined) { map.setPaintProperty(id, 'text-color', /water/.test(key) ? '#6f8fae' : '#c9ccd2'); map.setPaintProperty(id, 'text-halo-color', '#0b0c0f'); map.setPaintProperty(id, 'text-halo-width', 1.2); }
        }
      } catch { /* layer senza quella proprietà */ }
    }
  }

  // ---------- registrazione dello stile ----------
  let off = [];
  A.registerStyle({
    id: ID, name: 'Rally', tagline: 'note da copilota',
    defaults: { lead: 4.5, scale: 1, flat: true, dist: true, nav: true, learn: true, car: 'rally2', livery: 'bianca', view: '3d', car3d: 'flat' },
    aliases: ALIASES, instrDefault: false,
    routeTheme: { route: '#e8e8e8', casing: '#000000', width: 6 },
    restyle, genOptions,
    addLayers(map, before) {
      if (!map.getSource('rally-corners')) map.addSource('rally-corners', { type: 'geojson', data: A.fc([]) });
      map.addLayer({ id: 'rally-corners', type: 'line', source: 'rally-corners', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['get', 'c'], 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 3.5, 16, 8] } }, before);
      if (A.cur && R.notes.length) setTimeout(drawNotes, 0);
    },
    vehicle(mode) {
      const html = carHTML(mode === 'rear' ? 'rear' : 'top');
      const photo = !!carInfo();
      return { html, align: mode === 'rear' ? 'viewport' : 'map', cls: 'rcar ' + mode + (photo ? ' photo' : '') };
    },
    driveVehicleMode: () => S().view === '3d' ? carView('rear') : 'top',
    camera(p) { if (!p.drive) return { pitch: 0, padTop: 0.2 }; const is3d = S().view === '3d'; return { pitch: is3d ? 62 : 0, padTop: is3d ? 0.5 : 0.36, padBottom: 70 }; },
    renderSheet,
    popupExtras(ll, onRoute) { return onRoute && onRoute.d < 40 ? '<button class="pb hl" data-x="addcurve">Aggiungi una curva qui</button>' : ''; },
    onPopupAction(x, ll, onRoute) { if (x === 'addcurve' && onRoute) editor.addAt(onRoute.s); },
    stageData(cur) { return R.base && R.forCur === cur ? { base: R.base } : null; },
    settingsHTML, bindSettings,
    statsRows() { return [['Curve registrate per la taratura', calib.samples.length]]; },
    mount() {
      $('hud').innerHTML = HUD;
      if (!$('noteEd')) { document.body.insertAdjacentHTML('beforeend', EDITOR); bindEditor(); }
      $('btnStop').onclick = () => A.drive.stop();
      $('btnRepeat').onclick = () => { A.voice.unlock(); const c = R.calls[R.said >= 0 ? R.said : R.idx]; if (c) A.voice.say(callTokens(c)); };
      off = [
        A.on('route', onRoute),
        A.on('routeCleared', clearNotes),
        A.on('obstacles', () => { if (A.cur && R.base) { buildNotes(); drawNotes(); A.renderSheet(); } }),
        A.on('driveStart', d => { R.idx = 0; R.said = -1; R.cc = null; resync(A.drive.fix ? A.drive.fix.s : 0); $('hud').hidden = false; $('dMode').textContent = d.sim ? ' · sim' : ''; render({ s: 0, kmh: 0, rem: A.cur.route.length, eta: Date.now(), limit: null, next: null, over: false }); }),
        A.on('driveStop', () => { $('hud').hidden = true; R.labels.forEach(m => m.getElement().classList.remove('near')); }),
        A.on('tick', onTick),
        A.on('resync', s => resync(s)),
        A.on('driveFix', learn),
        A.on('reroute', r => { if (r.speak) A.voice.say(['ricalcolo']); }),
        A.on('offRoute', () => A.voice.say(['attento'])),
        A.on('instr', i => { if (A.wantsInstrVoice() && i.phase !== 'now') A.voice.speak(i.text); }),
        A.on('via', v => A.toast('Tappa raggiunta: ' + v.name, 3000)),
        A.on('arrive', () => A.toast('Arrivato a destinazione', 4000)),
        A.on('clipsChanged', renderCommands)
      ];
      A.map.on('zoom', labelVis);
      if (A.cur) onRoute(A.cur);
    },
    unmount() { off.forEach(f => f()); off = []; A.map.off('zoom', labelVis); clearNotes(); $('hud').innerHTML = ''; }
  });
  loadCustomCars(); calib.load();
  A.on('migrated', () => { loadCustomCars(); calib.load(); });
})();
