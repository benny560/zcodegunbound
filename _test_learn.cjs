// 验证 TRICO_LEARN 模块 + 67条物理回归(v1.15 vs v1.14 solver不变). node _test_learn.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const store = {};
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem(k) { return store[k] || null; }, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics, TL:(typeof TRICO_LEARN!=="undefined"?TRICO_LEARN:null)};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13;
const now = loadApi('gunbound_calculator.html');
const old = loadApi('gunbound_calculator.before_selflearn.html');
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';

console.log('=== 1. TRICO_LEARN 模块加载 ===');
const TL = now.TL;
if (!TL) { console.log('❌ TRICO_LEARN 未定义'); process.exit(1); }
const sum = TL.getSummary();
console.log(`  锚点总数=${sum.total} (种子${sum.seed}/命中${sum.user})  applyEnabled=${TL.applyEnabled}`);
console.log(`  分组: ${JSON.stringify(sum.byN)}`);

console.log('\n=== 2. 67条物理回归 (v1.15 solver vs v1.14, 应完全一致) ===');
let maxdA = 0, maxdP = 0, diff = 0;
for (const d of data) {
  const rn = (now.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || []).find(r => r.spinN === d.n);
  const ro = (old.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || []).find(r => r.spinN === d.n);
  if (!rn && !ro) continue;
  if (!rn || !ro) { diff++; continue; }
  maxdA = Math.max(maxdA, Math.abs(rn.angle - ro.angle));
  maxdP = Math.max(maxdP, Math.abs(rn.power - ro.power));
}
console.log(`  最大Δ角=${maxdA.toExponential(1)}  最大Δ力=${maxdP.toExponential(1)}  出现/消失差异=${diff}  (应全为0)`);

console.log('\n=== 3. getCorrection 抽样 (应在锚点附近给出小delta) ===');
function testCorr(side, n, dist, elev, wa, ws) {
  const effWa = side === 'left' ? (((180 - wa) % 360) + 360) % 360 : wa;
  const all = now.searchTrico3in1Physics(dist, 20, side, effWa, ws, (elev || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === n);
  if (!r) { console.log(`  ${side}N${n} d=${dist} 无物理解`); return; }
  const c = TL.getCorrection(side, n, dist, elev, wa, ws, r.angle, r.power);
  console.log(`  ${side}N${n} d=${dist} wa=${wa} ws=${ws}: 物理 ${r.angle.toFixed(1)}°/${r.power.toFixed(3)}  →  Δ角${c.dAngle>=0?'+':''}${c.dAngle.toFixed(2)}° Δ力${c.dPower>=0?'+':''}${c.dPower.toFixed(3)} [${c.count}样本 置信${(c.conf*100).toFixed(0)}% 最近${c.nearest.toFixed(2)}]`);
}
testCorr('right', 3, 7.15, 0, 146, 22);   // 种子里有完全相同的点 → delta应接近(命中-物理)
testCorr('right', 1, 17.4, 0.69, 315, 24); // 强顺风N1(物理偏差最大那条) → 应有明显修正
testCorr('left', 3, 20, 0, 0, 0);          // 无风 → 识别表已精确, delta应≈0
testCorr('right', 2, 100, 5, 90, 10);      // 远离所有锚点 → 置信0, delta=0

console.log('\n=== 4. 导入导出 round-trip ===');
const json = TL.exportJSON();
const before = TL.anchors.length;
const res = TL.importJSON(json);
console.log(`  导出${before}条, 重新导入: ${res.msg}, 现总数=${TL.anchors.length} (应翻倍=${before*2})`);
