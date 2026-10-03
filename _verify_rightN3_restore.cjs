// v1.49 右N3恢复7.20旧表 回归验证:
// ① 全side/N 多距离多环境: v1.49 vs v1.47基线(before_rightN3_ident) 逐位一致(完全回退)
// ② 右N3 无风全距离逐点对照
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
const NEW = loadApi('gunbound_calculator.html');                            // v1.49
const BASE = loadApi('gunbound_calculator.before_rightN3_ident.html');      // v1.47

function solve(api, side, n, d, wa, ws, elevUi) {
  const all = api.searchTrico3in1Physics(d, 20, side, wa, ws, (elevUi || 0) * EPPU) || [];
  return all.find(x => x.spinN === n) || null;
}

// ① 全side/N 逐位一致(完全回退验证)
console.log('== ① v1.49 vs v1.47基线 全side/N逐位 ==');
let diff = 0, tested = 0;
for (const [side, n] of [['right', 1], ['right', 2], ['right', 3], ['right', 4], ['left', 2], ['left', 3], ['left', 4]]) {
  for (const d of [3, 8, 15, 22, 30, 38]) {
    for (const env of [[0, 0, 0], [90, 12, 1], [270, 20, -1.5], [180, 8, 0], [0, 1, 0]]) {
      const [wa, ws, el] = env;
      const a = solve(NEW, side, n, d, wa, ws, el), b = solve(BASE, side, n, d, wa, ws, el);
      if (!a && !b) continue;
      tested++;
      if (!a || !b || a.angle !== b.angle || a.power !== b.power) {
        console.log(`  ✗ ${side} N${n} d=${d} wa=${wa} ws=${ws} el=${el}: ${a ? a.angle + '/' + a.power : 'null'} vs ${b ? b.angle + '/' + b.power : 'null'}`);
        diff++;
      }
    }
  }
}
console.log(diff === 0 ? `  ✓ ${tested} 组逐位一致(完全回退)` : `  ✗ ${diff}/${tested} 组有差异`);

// ② 右N3 无风全距离(1-50)逐点
console.log('\n== ② 右N3 无风 sd1-50 vs v1.47基线 ==');
let bad2 = 0;
for (let d = 1; d <= 50; d++) {
  const a = solve(NEW, 'right', 3, d, 0, 0, 0), b = solve(BASE, 'right', 3, d, 0, 0, 0);
  if (!a && !b) continue;
  if (!a || !b || a.angle !== b.angle || a.power !== b.power) { console.log(`  ✗ sd=${d}`); bad2++; }
}
console.log(bad2 === 0 ? '  ✓ sd1-50 全部逐位一致' : `  ✗ ${bad2} 点差异`);
