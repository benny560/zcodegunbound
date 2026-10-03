// Trico ballistic derivation v2 — data-driven.
// Validated relation (projectile): K*X^2 = p^2*( X*sin2t - Y*(1+cos2t) )
// Reparameterised with u = K*X = "range function" measured empirically at drop=0:
//     u^2 = p^2 * ( u*sin2t - g2*drop*(1+cos2t) )
// where u = u(dist) (table, extracted from drop=0 rows) and g2 = K*gamma (single unknown).
const fs = require('fs');
const P = 'c:/Users/fanli/Documents/zcodegunbound/beta/_data_base_R_clean.csv';
const L = fs.readFileSync(P, 'utf8').trim().split(/\r?\n/);
const hdr = L[0].replace(/"/g, '').split(','); const ix = {}; hdr.forEach((h, i) => ix[h] = i);
const D = Math.PI / 180;
const rows = [];
for (let i = 1; i < L.length; i++) {
  const c = L[i].replace(/"/g, '').split(',');
  const dist = +c[ix.dist], drop = +c[ix.drop];
  for (let n = 1; n <= 4; n++) {
    const a = c[ix['a' + n]], p = c[ix['p' + n]];
    if (a === '' || p === '') continue;
    const t = +a, pw = +p; if (!isFinite(t) || !isFinite(pw) || pw <= 0) continue;
    rows.push({ dist, drop, n, t, p: pw, s2: Math.sin(2 * t * D), c2: Math.cos(2 * t * D) });
  }
}
const med = a => { if (!a.length) return NaN; a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };

// ---------- 1) extract range function u(dist) from drop==0 rows ----------
console.log('=== u(dist) = p^2*sin(2t) at drop=0  (should agree across 旋) ===');
const U = {};
for (let d = 1; d <= 45; d++) {
  const sub = rows.filter(r => r.dist === d && r.drop === 0 && r.t < 86 && r.t > 4);
  if (!sub.length) continue;
  const vals = sub.map(r => r.p * r.p * r.s2);
  const m = med(vals);
  U[d] = m;
  const spread = (Math.max(...vals) - Math.min(...vals)) / m * 100;
  console.log(`  dist=${String(d).padStart(2)}  u=${m.toFixed(4)}  n=${sub.length}  旋spread=${spread.toFixed(1)}%  [${vals.map(v=>v.toFixed(3)).join(' ')}]`);
}
// u(dist) linearity check
console.log('\n=== u(dist) increments (reveals the distance-correction shape) ===');
const ds = Object.keys(U).map(Number).sort((a, b) => a - b);
for (let i = 1; i < ds.length; i++) {
  const d = ds[i], dp = ds[i - 1];
  console.log(`  d=${String(d).padStart(2)}  u=${U[d].toFixed(4)}  du/dd=${((U[d]-U[dp])/(d-dp)).toFixed(4)}  u/d=${(U[d]/d).toFixed(4)}`);
}

// ---------- 2) fit g2 using drop != 0 rows ----------
function resid(g2) {
  let se = 0, n = 0;
  for (const r of rows) {
    if (r.drop === 0) continue; if (!(r.dist in U)) continue; if (r.t >= 86 || r.t <= 4) continue;
    const u = U[r.dist];
    const rhs = r.p * r.p * (u * r.s2 - g2 * r.drop * (1 + r.c2));
    const e = (rhs - u * u) / (u * u);
    se += e * e; n++;
  }
  return { rms: Math.sqrt(se / n), n };
}
let bg = { rms: 1e9 };
for (let g = -3; g <= 3; g += 0.001) { const r = resid(g); if (r.rms < bg.rms) bg = { rms: r.rms, g2: g, n: r.n }; }
console.log('\n=== drop coefficient fit ===');
console.log(`g2 = K*gamma = ${bg.g2.toFixed(4)}   RMS relative residual = ${(bg.rms*100).toFixed(2)}%  (n=${bg.n})`);

// residual by band
function residBand(g2, filt) {
  let se = 0, n = 0;
  for (const r of rows) {
    if (r.drop === 0 || !(r.dist in U) || r.t >= 86 || r.t <= 4) continue;
    if (!filt(r)) continue;
    const u = U[r.dist];
    const e = (r.p * r.p * (u * r.s2 - g2 * r.drop * (1 + r.c2)) - u * u) / (u * u);
    se += e * e; n++;
  }
  return n ? { rms: Math.sqrt(se / n), n } : null;
}
console.log('\n=== residual by 旋 ===');
for (let n = 1; n <= 4; n++) { const r = residBand(bg.g2, x => x.n === n); if (r && r.n > 10) console.log(`  旋${n}: RMS=${(r.rms*100).toFixed(2)}%  n=${r.n}`); }
console.log('\n=== residual by distance band ===');
for (let d0 = 1; d0 <= 45; d0 += 5) { const r = residBand(bg.g2, x => x.dist >= d0 && x.dist < d0 + 5); if (r && r.n > 10) console.log(`  dist ${d0}-${d0+4}: RMS=${(r.rms*100).toFixed(2)}%  n=${r.n}`); }
console.log('\n=== residual by drop band ===');
for (let y0 = -15; y0 <= 15; y0 += 5) { const r = residBand(bg.g2, x => x.drop >= y0 && x.drop < y0 + 5); if (r && r.n > 10) console.log(`  drop ${y0}..${y0+4}: RMS=${(r.rms*100).toFixed(2)}%  n=${r.n}`); }

// ---------- 3) 旋 selector: flight-time proxy T = u/(K * p * cos t)  -> use p*cos t and u ----------
// T ∝ X/(v cos t) ; X = u/K, v ∝ p  => T ∝ u/(p cos t)
console.log('\n=== 旋 selector: Tp = u / (p*cos t)  (flight-time proxy) ===');
for (let n = 1; n <= 4; n++) {
  const sub = rows.filter(r => r.n === n && (r.dist in U) && r.t < 86 && r.t > 4);
  if (sub.length < 10) continue;
  const T = sub.map(r => U[r.dist] / (r.p * Math.cos(r.t * D)));
  const m = T.reduce((a, b) => a + b, 0) / T.length;
  const sd = Math.sqrt(T.reduce((a, b) => a + (b - m) * (b - m), 0) / T.length);
  console.log(`  旋${n}: n=${sub.length} mean=${m.toFixed(3)} sd=${sd.toFixed(3)} rel=${(sd/m*100).toFixed(1)}% min=${Math.min(...T).toFixed(2)} max=${Math.max(...T).toFixed(2)}`);
}
// ratio between consecutive 旋 at identical (dist,drop)
console.log('\n=== per-cell ratio of Tp between consecutive 旋 (median) ===');
const cell = {};
for (const r of rows) { const k = r.dist + '_' + r.drop; (cell[k] = cell[k] || {})[r.n] = r; }
for (let n = 1; n <= 3; n++) {
  const rs = [];
  for (const k in cell) {
    const A = cell[k][n], B = cell[k][n + 1];
    if (!A || !B || !(A.dist in U)) continue;
    if (A.t >= 86 || B.t >= 86 || A.t <= 4 || B.t <= 4) continue;
    const u = U[A.dist];
    rs.push((u / (B.p * Math.cos(B.t * D))) / (u / (A.p * Math.cos(A.t * D))));
  }
  if (rs.length) console.log(`  Tp(旋${n+1})/Tp(旋${n}): median=${med(rs).toFixed(4)} n=${rs.length}`);
}
