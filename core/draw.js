/* APEX — disegni comuni agli stili: frecce delle svolte, testo breve della manovra, angolo di uscita */
(function () {
  'use strict';
  const A = window.APEX;
  const ANG = { straight: 0, 'slight right': 40, right: 90, 'sharp right': 135, 'slight left': -40, left: -90, 'sharp left': -135, uturn: 180 };
  const D = A.draw = {};
  D.angle = m => (m ? (ANG[m.mod] || 0) : 0);
  D.isRound = m => !!m && (m.type === 'roundabout' || m.type === 'rotary' || m.type === 'exit roundabout' || m.type === 'exit rotary');
  // freccia della svolta: col = colore, w = spessore
  D.arrow = (m, col = '#fff', w = 4.6) => {
    if (!m) return '';
    const s = `fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
    if (m.type === 'arrive') return `<svg viewBox="0 0 48 48"><path d="M14 44V6" ${s}/><path d="M14 7h20l-5 7 5 7H14" fill="${col}" stroke="${col}" stroke-width="2" stroke-linejoin="round"/></svg>`;
    if (D.isRound(m)) return `<svg viewBox="0 0 48 48"><circle cx="24" cy="19" r="9" ${s}/><path d="M24 44V28" ${s}/><text x="24" y="23.5" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12" fill="${col}">${m.exit || ''}</text></svg>`;
    const ang = D.angle(m);
    if (ang === 180) return `<svg viewBox="0 0 48 48"><path d="M30 44V18a8 8 0 0 0-16 0v14" ${s}/><path d="M8 26l6 8 6-8" ${s}/></svg>`;
    const a = ang * Math.PI / 180, ex = 24 + Math.sin(a) * 15, ey = 22 - Math.cos(a) * 15;
    const p = k => [ex + Math.sin(a + k) * 8, ey - Math.cos(a + k) * 8].map(v => v.toFixed(1)).join(' ');
    return `<svg viewBox="0 0 48 48"><path d="M24 44V22L${ex.toFixed(1)} ${ey.toFixed(1)}" ${s}/><path d="M${p(0)}L${p(2.4)}L${p(-2.4)}Z" fill="${col}" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  };
  // testo breve: "Destra", "Rotonda 2ª", "Arrivo"
  D.short = m => {
    if (!m) return '';
    if (m.type === 'arrive') return m.final ? 'Arrivo' : 'Tappa';
    if (D.isRound(m)) return 'Rotonda ' + (m.exit ? m.exit + 'ª' : '');
    return { straight: 'Dritto', 'slight right': 'Leggermente a destra', right: 'Destra', 'sharp right': 'Tutto a destra', 'slight left': 'Leggermente a sinistra', left: 'Sinistra', 'sharp left': 'Tutto a sinistra', uturn: 'Inversione' }[m.mod] || A.cap(m.text);
  };
  // direzione (gradi) dopo la manovra
  D.capAfter = (route, m) => Math.round((A.routeBearing(route, Math.min(route.length - 1, m.s + 35)) + 360) % 360);
  D.paper = (a = .5) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .42 0 0 0 0 .34 0 0 0 0 .2 0 0 0 ${a} 0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`;
})();
