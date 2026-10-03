// Derive Trico ballistic law from the headless-sampled no-wind base grid.
// Physics model under test (standard projectile):
//   K * X^2 = p^2 * ( X*sin(2t) - Y*(1+cos(2t)) )     where K = g*PF^2
//   X = dist + beta   (effective horizontal distance, incl. distance correction)
//   Y = gamma * drop  (effective vertical offset)
const fs = require('fs');
const path = 'c:/Users/fanli/Documents/zcodegunbound/beta/_data_base_R_clean.csv';
const lines = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/);
const hdr = lines[0].replace(/"/g, '').split(',');
const idx = {}; hdr.forEach((h, i) => idx[h] = i);
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const c = lines[i].replace(/"/g, '').split(',');
  const dist = +c[idx.dist], drop = +c[idx.drop];
  for (let n = 1; n <= 4; n++) {
    const a = c[idx['a' + n]], p = c[idx['p' + n]];
    if (a === '' || p === '') continue;
    const t = +a, pw = +p;
    if (!isFinite(t) || !isFinite(pw) || pw <= 0) continue;
    rows.push({ dist, drop, n, t, p: pw });
  }
}
console.log('samples(旋-level):', rows.length);

const D = Math.PI / 180;
function impliedK(r, beta, gamma) {
  const X = r.dist + beta, Y = gamma * r.drop;
  if (X <= 0) return NaN;
  const s2 = Math.sin(2 * r.t * D), c2 = Math.cos(2 * r.t * D);
  return r.p * r.p * (X * s2 - Y * (1 + c2)) / (X * X);
}
// score = relative spread of implied K (lower = model fits better)
function score(beta, gamma, filt) {
  const v = [];
  for (const r of rows) {
    if (filt && !filt(r)) continue;
    const k = impliedK(r, beta, gamma);
    if (isFinite(k) && k > 0) v.push(k);
  }
  if (v.length < 50) return { s: 1e9, n: v.length };
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / v.length);
  return { s: sd / m, n: v.length, mean: m, sd };
}
// Use well-conditioned points only: angle not too close to 90 (sin2t tiny -> noise)
const good = r => r.t < 85 && r.t > 5;

// coarse then fine grid search over beta, gamma
let best = { s: 1e9 };
for (let b = -3; b <= 3; b += 0.02) {
  for (let g = -2; g <= 2; g += 0.05) {
    const r = score(b, g, good);
    if (r.s < best.s) best = { s: r.s, beta: b, gamma: g, mean: r.mean, n: r.n };
  }
}
for (let b = best.beta - 0.05; b <= best.beta + 0.05; b += 0.002) {
  for (let g = best.gamma - 0.1; g <= best.gamma + 0.1; g += 0.002) {
    const r = score(b, g, good);
    if (r.s < best.s) best = { s: r.s, beta: b, gamma: g, mean: r.mean, n: r.n };
  }
}
console.log('\n=== BEST FIT ===');
console.log('beta (distance offset) =', best.beta.toFixed(4));
console.log('gamma (drop scale)     =', best.gamma.toFixed(4));
console.log('K = g*PF^2             =', best.mean.toFixed(6));
console.log('relative spread of K   =', (best.s * 100).toFixed(3) + '%   (n=' + best.n + ')');

// residual breakdown by 旋 and by distance band
console.log('\n=== implied K by 旋 ===');
for (let n = 1; n <= 4; n++) {
  const r = score(best.beta, best.gamma, x => good(x) && x.n === n);
  if (r.n > 10) console.log(`  旋${n}: n=${r.n}  K=${r.mean.toFixed(5)}  spread=${(r.s*100).toFixed(2)}%`);
}
console.log('\n=== implied K by distance band ===');
for (let d0 = 1; d0 <= 45; d0 += 5) {
  const r = score(best.beta, best.gamma, x => good(x) && x.dist >= d0 && x.dist < d0 + 5);
  if (r.n > 10) console.log(`  dist ${d0}-${d0+4}: n=${r.n} K=${r.mean.toFixed(5)} spread=${(r.s*100).toFixed(2)}%`);
}
console.log('\n=== implied K by drop band ===');
for (let y0 = -15; y0 <= 15; y0 += 5) {
  const r = score(best.beta, best.gamma, x => good(x) && x.drop >= y0 && x.drop < y0 + 5);
  if (r.n > 10) console.log(`  drop ${y0}..${y0+4}: n=${r.n} K=${r.mean.toFixed(5)} spread=${(r.s*100).toFixed(2)}%`);
}

// ---- the 旋 selector: what distinguishes 旋 n? examine flight-time proxy ----
// T ∝ X / (p*cos t)   ; also rotation proxies
console.log('\n=== 旋 invariants (median over samples) ===');
function med(a){ a=a.slice().sort((x,y)=>x-y); return a.length? a[Math.floor(a.length/2)] : NaN; }
for (let n = 1; n <= 4; n++) {
  const sub = rows.filter(r => r.n === n && good(r));
  if (sub.length < 10) continue;
  const T = sub.map(r => (r.dist + best.beta) / (r.p * Math.cos(r.t * D)));
  const vT = sub.map(r => r.p * ((r.dist + best.beta) / (r.p * Math.cos(r.t * D))));  // p*T
  const pT2 = sub.map(r => r.p * r.p * ((r.dist + best.beta) / (r.p * Math.cos(r.t * D))));
  console.log(`  旋${n}: n=${sub.length}  medT=${med(T).toFixed(4)}  med(p*T)=${med(vT).toFixed(4)}  med(p^2*T)=${med(pT2).toFixed(4)}`);
}
// check spread of T within each 旋 (is flight time the invariant?)
console.log('\n=== spread of T-proxy within each 旋 ===');
for (let n = 1; n <= 4; n++) {
  const sub = rows.filter(r => r.n === n && good(r));
  if (sub.length < 10) continue;
  const T = sub.map(r => (r.dist + best.beta) / (r.p * Math.cos(r.t * D)));
  const m = T.reduce((a,b)=>a+b,0)/T.length;
  const sd = Math.sqrt(T.reduce((a,b)=>a+(b-m)*(b-m),0)/T.length);
  console.log(`  旋${n}: T mean=${m.toFixed(4)} sd=${sd.toFixed(4)} rel=${(sd/m*100).toFixed(1)}%  min=${Math.min(...T).toFixed(3)} max=${Math.max(...T).toFixed(3)}`);
}
