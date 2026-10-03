// T残差校准诊断: 实测反推T_m vs 计算器T_c; 并测"若T完美"能否更贴合实测. node _T_residual.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13, PF = 0.004332712, RAD = Math.PI / 180;
const api = loadApi('gunbound_calculator.html');
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';

// 反推T: 0.5*xA*T^2 + vx*T - xDist = 0, 双正根用y方程yErr最小选根
function solveTfromShot(angleDeg, V, xA, effGrav, xDist, elev) {
  const a = 0.5 * xA, b = V * Math.cos(angleDeg * RAD), c = -xDist;
  const vy = V * Math.sin(angleDeg * RAD);
  let roots = [];
  if (Math.abs(a) < 1e-9) { if (Math.abs(b) > 1e-9) roots = [-c / b]; }
  else { const disc = b * b - 4 * a * c; if (disc >= 0) { const q = Math.sqrt(disc); roots = [(-b + q) / (2 * a), (-b - q) / (2 * a)]; } }
  roots = roots.filter(t => t > 0.01 && t < 20);
  if (!roots.length) return null;
  let best = null, bestErr = Infinity;
  for (const T of roots) { const yLand = vy * T - 0.5 * effGrav * T * T; const e = Math.abs(yLand - elev); if (e < bestErr) { bestErr = e; best = { T, yErr: e }; } }
  return best;
}

const R = [];
for (const d of data) {
  if (d.distance <= 0) continue;  // 背射路径不同, 只诊断正向
  const all = api.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === d.n); if (!r) continue;
  const cr = r.centerResult; if (!cr) continue;
  const xA = parseFloat(cr.xA) || 0, effGrav = parseFloat(cr.effectiveGravity) || 430;
  const sd = Math.abs(d.distance), xDist = sd * 40, elev = (d.elevation || 0) * EPPU;
  const Tc = parseFloat(cr.time), Vm = d.power / PF;
  const sol = solveTfromShot(d.angle, Vm, xA, effGrav, xDist, elev);
  if (!sol) continue;
  const Tm = sol.T;
  // 若用完美 T_m 重新 given-time 求解 → 角度/力度
  const numY = elev + 0.5 * effGrav * Tm * Tm, denomX = xDist - 0.5 * xA * Tm * Tm;
  const aGt = Math.atan2(numY, denomX) / RAD, Vgt = Math.sqrt(numY * numY + denomX * denomX) / Tm, pGt = Vgt * PF;
  const wE = eff(d), force = d.windStrength === 0 ? 0 : Math.max(0, d.windStrength - 1);
  R.push({
    side: d.side, n: d.n, dist: d.distance, ws: d.windStrength, fx: force * Math.cos(wE * RAD),
    Tc, Tm, dT: Tc - Tm, yErr: sol.yErr, yErrSD: sol.yErr / 40,
    dA_now: r.angle - d.angle, dP_now: r.power - d.power,      // 计算器当前 vs 实测
    dA_gt: aGt - d.angle, dP_gt: pGt - d.power,                 // 完美T重解 vs 实测
  });
}
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const mae = a => mean(a.map(Math.abs));
const pearson = (x, y) => { const mx = mean(x), my = mean(y); let c = 0, sx = 0, sy = 0; for (let i = 0; i < x.length; i++) { c += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return c / (Math.sqrt(sx * sy) || 1); };

console.log('============ T残差校准诊断 (正向 ' + R.length + ' 条) ============\n');
console.log('--- 1. 计算器T_c vs 实测反推T_m (dT=Tc-Tm, 秒) ---');
console.log(`全部: dT mean=${mean(R.map(r => r.dT)).toFixed(3)}s  std=${std(R.map(r => r.dT)).toFixed(3)}  |dT|mean=${mae(R.map(r => r.dT)).toFixed(3)}`);
console.log(`     反推T自洽度 yErr: mean=${(mean(R.map(r => r.yErr))).toFixed(1)}px (${mean(R.map(r => r.yErrSD)).toFixed(2)}SD) — 越大说明数据越不自洽(噪声底)`);
console.log(`     dT vs 水平风fx 相关 r=${pearson(R.map(r => r.fx), R.map(r => r.dT)).toFixed(2)}  |  dT vs 风力ws r=${pearson(R.map(r => r.ws), R.map(r => r.dT)).toFixed(2)}`);
console.log('\n组      n   dT_mean  dT_std  yErr(SD)');
const grp = {}; for (const r of R) { (grp[`${r.side}N${r.n}`] = grp[`${r.side}N${r.n}`] || []).push(r); }
for (const k of Object.keys(grp).sort()) { const g = grp[k]; console.log(`${k.padEnd(6)} ${String(g.length).padStart(2)}   ${mean(g.map(r => r.dT)).toFixed(3).padStart(6)}  ${std(g.map(r => r.dT)).toFixed(3)}   ${mean(g.map(r => r.yErrSD)).toFixed(2)}`); }

console.log('\n--- 2. 决定性检验: 若T完美(=T_m)重解, 能否更贴合实测? ---');
console.log(`计算器当前:   角度MAE=${mae(R.map(r => r.dA_now)).toFixed(2)}°  力度MAE=${mae(R.map(r => r.dP_now)).toFixed(4)}`);
console.log(`完美T重解:    角度MAE=${mae(R.map(r => r.dA_gt)).toFixed(2)}°  力度MAE=${mae(R.map(r => r.dP_gt)).toFixed(4)}   ← 这是"修T的理论上限"`);
console.log(`(若完美T重解仍不为0, 说明数据非抛物线自洽, 那部分是修不掉的噪声底)`);
