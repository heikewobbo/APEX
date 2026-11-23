/* APEX — utilità comuni: geometria, formati, memoria locale, database, messaggi */
(function () {
  'use strict';
  const A = window.APEX = window.APEX || {};
  const $ = A.$ = id => document.getElementById(id);
  A.esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  A.cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

  // ---------- geometria (coordinate [lat, lon]) ----------
  const toRad = A.toRad = d => d * Math.PI / 180;
  const toDeg = A.toDeg = r => r * 180 / Math.PI;
  A.bearingLL = (a, b) => {
    const y = Math.sin(toRad(b[1] - a[1])) * Math.cos(toRad(b[0])), x = Math.cos(toRad(a[0])) * Math.sin(toRad(b[0])) - Math.sin(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.cos(toRad(b[1] - a[1]));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };
  A.distLL = (a, b) => { const R = 6371000, dLa = toRad(b[0] - a[0]), dLo = toRad(b[1] - a[1]); const h = Math.sin(dLa / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  A.angDiff = (a, b) => ((a - b + 540) % 360) - 180;
  A.boundsOf = latlon => {
    let w = 180, s = 90, e = -180, n = -90;
    for (const [la, lo] of latlon) { if (lo < w) w = lo; if (lo > e) e = lo; if (la < s) s = la; if (la > n) n = la; }
    return [[w, s], [e, n]];
  };
  A.offsetLL = (ll, bearing, m) => { const k = 111320 * Math.cos(toRad(ll[0])); return [ll[0] + Math.cos(toRad(bearing)) * m / 110574, ll[1] + Math.sin(toRad(bearing)) * m / k]; };

  // ---------- formati ----------
  A.fmtKm = m => m >= 10000 ? Math.round(m / 1000) + ' km' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
  A.fmtDist = m => m < 1000 ? Math.max(0, Math.round(m / 10) * 10) + ' m' : A.fmtKm(m);
  A.fmtMin = s => { const m = Math.round(s / 60); return m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min'; };
  A.clock = ms => new Date(ms).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  A.spokenDist = m => { if (m >= 1000) { const k = Math.round(m / 100) / 10; return k === 1 ? '1 chilometro' : String(k).replace('.', ',') + ' chilometri'; } return (m >= 200 ? Math.round(m / 50) * 50 : Math.round(m / 10) * 10) + ' metri'; };

  // ---------- memoria locale (impostazioni, piccoli dati) ----------
  A.store = {
    get(k, d) { try { const v = localStorage.getItem('apex.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('apex.' + k, JSON.stringify(v)); } catch { /* pieno o non disponibile */ } }
  };

  // ---------- database sul telefono (voci, auto, prove, taratura) ----------
  A.db = (() => {
    let p = null;
    const STORES = ['clips', 'cars', 'stages', 'calib'];
    const open = () => p || (p = new Promise((res, rej) => {
      const r = indexedDB.open('apex', 1);
      r.onupgradeneeded = () => { for (const st of STORES) if (!r.result.objectStoreNames.contains(st)) r.result.createObjectStore(st); };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const tx = async (st, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(st, mode); const out = fn(t.objectStore(st)); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };
    return {
      replaceAll: (st, m) => tx(st, 'readwrite', s => { s.clear(); for (const [k, v] of m) s.put(v, k); }),
      put: (st, k, v) => tx(st, 'readwrite', s => s.put(v, k)),
      del: (st, keys) => tx(st, 'readwrite', s => keys.forEach(k => s.delete(k))),
      async get(st, k) { const d = await open(); return new Promise((res, rej) => { const req = d.transaction(st).objectStore(st).get(k); req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); }); },
      async getAll(st) { const d = await open(); return new Promise((res, rej) => { const out = new Map(); const req = d.transaction(st).objectStore(st).openCursor(); req.onsuccess = () => { const c = req.result; if (c) { out.set(c.key, c.value); c.continue(); } else res(out); }; req.onerror = () => rej(req.error); }); }
    };
  })();
  // chiede a Safari di non cancellare i dati quando serve spazio
  A.keepData = () => { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch { /* non supportato */ } };

  // ---------- eventi tra motore e stili ----------
  const handlers = {};
  A.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); return () => A.off(ev, fn); };
  A.off = (ev, fn) => { handlers[ev] = (handlers[ev] || []).filter(f => f !== fn); };
  A.emit = (ev, data) => { for (const fn of (handlers[ev] || []).slice()) { try { fn(data); } catch (e) { console.error(ev, e); } } };

  // ---------- messaggi ----------
  let toastT;
  A.toast = (msg, ms = 3000, spin = false) => {
    const t = $('toast'); if (!t) return;
    t.innerHTML = (spin ? '<span class="spin"></span>' : '') + A.esc(msg); t.hidden = false;
    clearTimeout(toastT); if (ms) toastT = setTimeout(() => t.hidden = true, ms);
  };
  A.toastHide = () => { const t = $('toast'); if (t) t.hidden = true; };
})();
