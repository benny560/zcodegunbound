// v1.14 计算器 vs 67条实测 全量对比(角度+力度). 用法: node _compare_v114.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13;
const api = loadApi('gunbound_calculator.html');
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';

const rows = [];
let missing = [];
for (const d of data) {
  const dir = sk(d);
  // 背射靠 distance<0 路由到 calcBackshotWithWind, 必须传带符号距离(不能 abs!)
  const all = api.searchTrico3in1Physics(d.distance, 20, dir, eff(d), d.windStrength, (d.elevation || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === d.n);
  if (!r) { missing.push(d); continue; }
  rows.push({
    side: d.side, n: d.n, dist: d.distance, elev: d.elevation || 0, wa: d.windAngle, ws: d.windStrength,
    mA: d.angle, mP: d.power, pA: r.angle, pP: r.power,
    dA: r.angle - d.angle, dP: r.power - d.power,
  });
}

// 分组统计
function stat(list, key) {
  const a = list.map(r => Math.abs(r.dA)), p = list.map(r => Math.abs(r.dP));
  const mean = arr => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
  const max = arr => arr.reduce((s, x) => Math.max(s, x), 0);
  return { key, n: list.length, maeA: mean(a), maxA: max(a), maeP: mean(p), maxP: max(p) };
}
console.log('==================== v1.14 计算器 vs 67条实测 (角度°/力度) ====================');
console.log('分组          样本  角度MAE  角度Max   力度MAE   力度Max');
const groups = {};
for (const r of rows) { const k = `${r.side}攻 N${r.n}`; (groups[k] = groups[k] || []).push(r); }
for (const k of Object.keys(groups).sort()) {
  const s = stat(groups[k]);
  console.log(`${k.padEnd(12)}  ${String(s.n).padStart(3)}   ${s.maeA.toFixed(2).padStart(6)}  ${s.maxA.toFixed(2).padStart(6)}   ${s.maeP.toFixed(4).padStart(7)}  ${s.maxP.toFixed(4).padStart(7)}`);
}
console.log('----------------------------------------------------------------------------');
for (const side of ['右', '左']) {
  const s = stat(rows.filter(r => r.side === side));
  console.log(`${(side + '攻 合计').padEnd(12)}  ${String(s.n).padStart(3)}   ${s.maeA.toFixed(2).padStart(6)}  ${s.maxA.toFixed(2).padStart(6)}   ${s.maeP.toFixed(4).padStart(7)}  ${s.maxP.toFixed(4).padStart(7)}`);
}
const sAll = stat(rows);
console.log(`${'全部'.padEnd(12)}  ${String(sAll.n).padStart(3)}   ${sAll.maeA.toFixed(2).padStart(6)}  ${sAll.maxA.toFixed(2).padStart(6)}   ${sAll.maeP.toFixed(4).padStart(7)}  ${sAll.maxP.toFixed(4).padStart(7)}`);

// 正向(dist>0) vs 背射(dist<0) 拆分
console.log('\n---- 正向 vs 背射 拆分 ----');
const fwd = stat(rows.filter(r => r.dist > 0));
const back = stat(rows.filter(r => r.dist < 0));
console.log(`${'正向射击'.padEnd(12)}  ${String(fwd.n).padStart(3)}   ${fwd.maeA.toFixed(2).padStart(6)}  ${fwd.maxA.toFixed(2).padStart(6)}   ${fwd.maeP.toFixed(4).padStart(7)}  ${fwd.maxP.toFixed(4).padStart(7)}`);
console.log(`${'背射(dist<0)'.padEnd(11)}  ${String(back.n).padStart(3)}   ${back.maeA.toFixed(2).padStart(6)}  ${back.maxA.toFixed(2).padStart(6)}   ${back.maeP.toFixed(4).padStart(7)}  ${back.maxP.toFixed(4).padStart(7)}`);

// 角度偏差最大的10条
console.log('\n---- 角度偏差最大 Top10 (预测-实测) ----');
console.log('side N  dist  elev  wa   ws  | 实测角/力     预测角/力     Δ角     Δ力');
for (const r of [...rows].sort((a, b) => Math.abs(b.dA) - Math.abs(a.dA)).slice(0, 10)) {
  console.log(`${r.side}   ${r.n}  ${String(r.dist).padStart(4)}  ${String(r.elev).padStart(4)}  ${String(r.wa).padStart(3)}  ${String(r.ws).padStart(3)} | ${r.mA.toFixed(1).padStart(5)}/${r.mP.toFixed(3)}  ${r.pA.toFixed(1).padStart(5)}/${r.pP.toFixed(3)}  ${(r.dA >= 0 ? '+' : '') + r.dA.toFixed(2)}  ${(r.dP >= 0 ? '+' : '') + r.dP.toFixed(3)}`);
}
// 力度偏差最大的10条
console.log('\n---- 力度偏差最大 Top10 (预测-实测) ----');
console.log('side N  dist  elev  wa   ws  | 实测角/力     预测角/力     Δ角     Δ力');
for (const r of [...rows].sort((a, b) => Math.abs(b.dP) - Math.abs(a.dP)).slice(0, 10)) {
  console.log(`${r.side}   ${r.n}  ${String(r.dist).padStart(4)}  ${String(r.elev).padStart(4)}  ${String(r.wa).padStart(3)}  ${String(r.ws).padStart(3)} | ${r.mA.toFixed(1).padStart(5)}/${r.mP.toFixed(3)}  ${r.pA.toFixed(1).padStart(5)}/${r.pP.toFixed(3)}  ${(r.dA >= 0 ? '+' : '') + r.dA.toFixed(2)}  ${(r.dP >= 0 ? '+' : '') + r.dP.toFixed(3)}`);
}
// 背射逐条(全部)
console.log('\n---- 背射逐条 (全部 dist<0) ----');
console.log('side N  dist  elev  wa   ws  | 实测角/力     预测角/力     Δ角     Δ力');
for (const r of rows.filter(r => r.dist < 0).sort((a, b) => a.dist - b.dist)) {
  console.log(`${r.side}   ${r.n}  ${String(r.dist).padStart(5)}  ${String(r.elev).padStart(4)}  ${String(r.wa).padStart(3)}  ${String(r.ws).padStart(3)} | ${r.mA.toFixed(1).padStart(5)}/${r.mP.toFixed(3)}  ${r.pA.toFixed(1).padStart(5)}/${r.pP.toFixed(3)}  ${(r.dA >= 0 ? '+' : '') + r.dA.toFixed(2)}  ${(r.dP >= 0 ? '+' : '') + r.dP.toFixed(3)}`);
}
if (missing.length) {
  console.log(`\n⚠ 求解器无结果 ${missing.length} 条:`);
  for (const d of missing) console.log(`  ${d.side} N${d.n} dist=${d.distance} elev=${d.elevation || 0} wa=${d.windAngle} ws=${d.windStrength}`);
} else {
  console.log('\n✓ 67条全部有解, 无遗漏');
}
