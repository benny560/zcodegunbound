// §3 审计: 背射 vs 正向 的 centerResult 单位, 及取整解(当前公式 vs 原生公式). node _test_round_backshot.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const store = {};
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem(k) { return store[k] || null; }, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13, PF = 0.004332712;
const api = loadApi('gunbound_calculator.html');
const eff = (side, wa) => side === 'left' ? (((180 - wa) % 360) + 360) % 360 : wa;

// 复现两种取整解公式(落点守恒优先, 否则T守恒)
function roundPow(cr, powerRaw, spinN, targetAngle, useNat) {
  const T_raw = parseFloat(cr.time), xA = parseFloat(cr.xA) || 0, effGrav = parseFloat(cr.effectiveGravity) || 430;
  if (!(T_raw > 0) || effGrav <= 0) return null;
  const Vnat = parseFloat(cr.velocity);
  const rawV = useNat ? Vnat : powerRaw / PF;
  const kPow = useNat ? (Vnat > 0 ? powerRaw / Vnat : PF) : PF;
  const rawA = cr.angleRaw != null ? cr.angleRaw : cr.angle;
  const cosRaw = Math.cos(rawA * Math.PI / 180), sinRaw = Math.sin(rawA * Math.PI / 180);
  const xTarget = rawV * cosRaw * T_raw + 0.5 * xA * T_raw * T_raw;
  const yTarget = rawV * sinRaw * T_raw - 0.5 * effGrav * T_raw * T_raw;
  const tol = { 1: 0.05, 2: 0.08, 3: 0.12, 4: 0.15 }[spinN] || 0.12;
  const tanT = Math.tan(targetAngle * Math.PI / 180), cosT = Math.cos(targetAngle * Math.PI / 180);
  const denom = effGrav + xA * tanT;
  let landing = null;
  if (denom > 0 && isFinite(denom)) {
    const T2 = 2 * (tanT * xTarget - yTarget) / denom;
    if (T2 > 0) { const Tn = Math.sqrt(T2); const Vn = (xTarget - 0.5 * xA * Tn * Tn) / (cosT * Tn); if (Vn > 0 && Vn < 2000) { const p = Vn * kPow; if (p > 0 && p < 7) landing = { power: p, dT: Math.abs(Tn - T_raw) }; } }
  }
  if (landing && landing.dT <= tol) return { power: landing.power, mode: 'land' };
  const sinT = Math.sin(targetAngle * Math.PI / 180);
  if (sinT <= 0.001) return landing ? { power: landing.power, mode: 'land!' } : null;
  const V_tc = (yTarget + 0.5 * effGrav * T_raw * T_raw) / (sinT * T_raw);
  const p_tc = V_tc * kPow;
  if (!(p_tc > 0 && p_tc < 7)) return landing ? { power: landing.power, mode: 'land!' } : null;
  const xLand_tc = V_tc * cosT * T_raw + 0.5 * xA * T_raw * T_raw;
  const xErrSD = (xLand_tc - xTarget) / (800 / 20);
  return { power: p_tc, mode: 'Tcons', xErrSD };
}

const cases = [
  ['背射', 'right', 3, -8.2, 0.5, 133, 21], ['背射', 'right', 3, -4.68, 2.8, 135, 25],
  ['背射', 'right', 2, -5.5, -0.5, 135, 25], ['背射', 'right', 3, -8.7, 0.5, 197, 15],
  ['正向', 'right', 3, 7.15, 0, 146, 22], ['正向', 'left', 3, 20, 0, 0, 0],
];
console.log('类型  side N   dist   | cr.velocity  cr.power  cr.xA     cr.effGrav  cr.time  backshotRoute');
for (const [lbl, side, n, dist, elev, wa, ws] of cases) {
  const all = api.searchTrico3in1Physics(dist, 20, side, eff(side, wa), ws, (elev || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === n); if (!r) { console.log(`${lbl} ${side} N${n} d=${dist}: 无解`); continue; }
  const cr = r.centerResult;
  console.log(`${lbl}  ${side.padEnd(5)} ${n}  ${String(dist).padStart(5)} | ${String(cr.velocity).padStart(9)}  ${String(cr.power).padStart(7)}  ${String(cr.xA).padStart(8)}  ${String(cr.effectiveGravity).padStart(8)}  ${String(cr.time).padStart(6)}  ${cr.backshotRoute || false}`);
}
console.log('\n取整解对比 (raw力度 | 当前公式powerRaw/PF | 原生公式velocity+k):');
for (const [lbl, side, n, dist, elev, wa, ws] of cases) {
  const all = api.searchTrico3in1Physics(dist, 20, side, eff(side, wa), ws, (elev || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === n); if (!r) continue;
  const cr = r.centerResult; const rawA = cr.angleRaw != null ? cr.angleRaw : cr.angle;
  const aF = Math.floor(rawA + 1e-9), aC = Math.ceil(rawA - 1e-9);
  const cur = roundPow(cr, r.power, n, aF, false), nat = roundPow(cr, r.power, n, aF, true);
  console.log(`${lbl} ${side} N${n} d=${dist} rawA=${rawA.toFixed(1)}→${aF}: raw力=${r.power.toFixed(3)} | 当前=${cur ? cur.power.toFixed(3) + '(落点偏SD ' + (cur.xErrSD != null ? cur.xErrSD.toFixed(2) : '-') + ')' : 'null'} | 原生=${nat ? nat.power.toFixed(3) + '(落点偏SD ' + (nat.xErrSD != null ? nat.xErrSD.toFixed(2) : '-') + ')' : 'null'}`);
}
