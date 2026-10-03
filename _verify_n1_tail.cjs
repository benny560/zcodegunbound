// v1.50 右N1尾段外推+力度>4.1过滤 回归验证
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
const NEW = loadApi('gunbound_calculator.html');                    // v1.50
const OLD = loadApi('gunbound_calculator.before_n1_tail.html');     // v1.49

function solve(api, side, n, d, wa, ws, elevUi) {
  const all = api.searchTrico3in1Physics(d, 20, side, wa, ws, (elevUi || 0) * EPPU) || [];
  return all.find(x => x.spinN === n) || null;
}

// ① 右N1 无风 sd18-26 行为
console.log('== ① 右N1 无风 sd18-26 (新) ==');
for (let d = 18; d <= 26; d++) {
  const r = solve(NEW, 'right', 1, d, 0, 0, 0);
  console.log(`  sd=${d}: ${r ? r.angle + '/' + r.power : '无解(或被>4.1过滤)'}`);
}

// ② 右N1 sd1-22 无风 + 多环境 逐位不变
console.log('\n== ② 右N1 sd1-22 新旧逐位 ==');
let diff = 0, tested = 0;
for (let d = 1; d <= 22; d++) {
  for (const [wa, ws] of [[0, 0], [0, 10], [90, 15], [180, 8], [270, 12]]) {
    const a = solve(NEW, 'right', 1, d, wa, ws, 0), b = solve(OLD, 'right', 1, d, wa, ws, 0);
    if (!a && !b) continue;
    tested++;
    if (!a || !b || a.angle !== b.angle || a.power !== b.power) {
      console.log(`  ✗ d=${d} wa=${wa} ws=${ws}: ${a ? a.angle + '/' + a.power : 'null'} vs ${b ? b.angle + '/' + b.power : 'null'}`);
      diff++;
    }
  }
}
console.log(diff === 0 ? `  ✓ ${tested} 组逐位一致` : `  ✗ ${diff}/${tested} 组差异`);

// ③ sd23/24 有风: 顺风力度压下来应出解(≤4.1), 逆风大力度应被过滤
console.log('\n== ③ 右N1 sd23/24 有风行为 ==');
for (const d of [23, 24]) {
  for (const [wa, ws] of [[0, 5], [0, 10], [0, 15], [0, 20], [0, 26], [180, 10]]) {
    const r = solve(NEW, 'right', 1, d, wa, ws, 0);
    console.log(`  sd=${d} wa=${wa} ws=${ws}: ${r ? r.angle.toFixed(1) + '/' + r.power.toFixed(3) : '无解/过滤'}`);
  }
}

// ④ 其他N + 左侧 逐位不变
console.log('\n== ④ 其他side/N 新旧逐位 ==');
let diff4 = 0, tested4 = 0;
for (const [side, n] of [['right', 2], ['right', 3], ['right', 4], ['left', 2], ['left', 3], ['left', 4]]) {
  for (const d of [5, 15, 25, 38]) {
    for (const [wa, ws, el] of [[0, 0, 0], [90, 12, 1], [270, 20, -1.5]]) {
      const a = solve(NEW, side, n, d, wa, ws, el), b = solve(OLD, side, n, d, wa, ws, el);
      if (!a && !b) continue;
      tested4++;
      if (!a || !b || a.angle !== b.angle || a.power !== b.power) { diff4++; console.log(`  ✗ ${side} N${n} d=${d}`); }
    }
  }
}
console.log(diff4 === 0 ? `  ✓ ${tested4} 组逐位一致` : `  ✗ ${diff4}/${tested4} 组差异`);

// ⑤ 全库扫描: N1 力度>4.1 泄漏检查(不该出现) + 正常N1解无误杀(力度≤4.1都在)
console.log('\n== ⑤ N1 >4.1 泄漏扫描(全距离全风) ==');
let leak = 0, killed = 0;
for (let d = 1; d <= 26; d++) {
  for (const wa of [0, 90, 180, 270]) {
    for (const ws of [0, 8, 16, 24]) {
      const r = solve(NEW, 'right', 1, d, wa, ws, 0);
      if (r && r.power > 4.1) { leak++; console.log(`  ✗ 泄漏 d=${d} wa=${wa} ws=${ws}: ${r.power}`); }
      const o = solve(OLD, 'right', 1, d, wa, ws, 0);
      if (o && o.power <= 4.1 && !r) { killed++; console.log(`  ✗ 误杀 d=${d} wa=${wa} ws=${ws}: 旧=${o.angle}/${o.power}`); }
    }
  }
}
console.log(`  泄漏=${leak} 误杀=${killed} ${leak === 0 && killed === 0 ? '✓' : '✗'}`);
