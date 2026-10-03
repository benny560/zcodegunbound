// v1.52 无风统一基线表标定求解器 回归验证
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics,EXCEL_TRICO};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13;
const NEW = loadApi('gunbound_calculator.html');                        // v1.52
const OLD = loadApi('gunbound_calculator.before_unified_solver.html');  // v1.51

function solve(api, side, n, d, wa, ws, elevUi) {
  const all = api.searchTrico3in1Physics(d, 20, side, wa, ws, (elevUi || 0) * EPPU) || [];
  return all.find(x => x.spinN === n) || null;
}

// ① 0风0落差: 全side/N 全整数距离 + 半点距离, 新旧逐位 + 与基线表一致 + source
console.log('== ① 0风0落差 新旧逐位 + source ==');
let d1 = 0, t1 = 0; const srcs = new Set();
for (const [side, dMax] of [['right', 50], ['left', 42]]) {
  for (const n of [1, 2, 3, 4]) {
    for (let d = 1; d <= dMax; d += 0.5) {
      const a = solve(NEW, side, n, d, 0, 0, 0), b = solve(OLD, side, n, d, 0, 0, 0);
      if (!a && !b) continue;
      t1++;
      if (a) srcs.add((a.centerResult && a.centerResult.source) || '');
      if (!a || !b || a.angle !== b.angle || a.power !== b.power) { d1++; if (d1 < 6) console.log(`  ✗ ${side} N${n} d=${d}: ${a ? a.angle + '/' + a.power : 'null'} vs ${b ? b.angle + '/' + b.power : 'null'}`); }
    }
  }
}
console.log(d1 === 0 ? `  ✓ ${t1} 组逐位一致` : `  ✗ ${d1}/${t1}`);
console.log('  source集合:', [...srcs].join(' | '));

// ② 无风有落差 N2-4: 与v1.51逐位一致
console.log('\n== ② 无风有落差 N2-4 新旧逐位 ==');
let d2 = 0, t2 = 0;
for (const [side, dMax] of [['right', 50], ['left', 42]]) {
  for (const n of [2, 3, 4]) {
    for (let d = 3; d <= dMax; d += 4) {
      for (const el of [0.5, 1, -1, 2]) {
        const a = solve(NEW, side, n, d, 0, 0, el), b = solve(OLD, side, n, d, 0, 0, el);
        if (!a && !b) continue;
        t2++;
        if (!a || !b || a.angle !== b.angle || a.power !== b.power) { d2++; console.log(`  ✗ ${side} N${n} d=${d} el=${el}`); }
      }
    }
  }
}
console.log(d2 === 0 ? `  ✓ ${t2} 组逐位一致` : `  ✗ ${d2}/${t2}`);

// ③ N1 无风有落差: 新旧差异(预期微小, 切换到锚点法)
console.log('\n== ③ N1 无风有落差 新旧差异(right, sd1-22) ==');
let worst3 = { dA: 0 };
for (let d = 1; d <= 22; d += 0.5) {
  for (const el of [0.5, 1, -1]) {
    const a = solve(NEW, 'right', 1, d, 0, 0, el), b = solve(OLD, 'right', 1, d, 0, 0, el);
    if (!a || !b) { if ((a && !b) || (!a && b)) console.log(`  解存在性变化 d=${d} el=${el}: 新=${!!a} 旧=${!!b}`); continue; }
    const dA = Math.abs(a.angle - b.angle), dP = Math.abs(a.power - b.power);
    if (dA > worst3.dA) worst3 = { dA, dP, d, el };
  }
}
console.log(`  最大差异 Δ角=${worst3.dA.toFixed(3)}° Δ力=${(worst3.dP || 0).toFixed(4)} @d=${worst3.d} el=${worst3.el}`);

// ④ 有风 逐位不变
console.log('\n== ④ 有风解 新旧逐位 ==');
let d4 = 0, t4 = 0;
for (const side of ['right', 'left']) {
  for (const n of [1, 2, 3, 4]) {
    for (const d of [5, 15, 25, 35]) {
      for (const [wa, ws, el] of [[0, 1, 0], [90, 12, 1], [180, 8, -1], [270, 20, 0.5]]) {
        const a = solve(NEW, side, n, d, wa, ws, el), b = solve(OLD, side, n, d, wa, ws, el);
        if (!a && !b) continue;
        t4++;
        if (!a || !b || a.angle !== b.angle || a.power !== b.power) { d4++; console.log(`  ✗ ${side} N${n} d=${d} wa=${wa} ws=${ws} el=${el}`); }
      }
    }
  }
}
console.log(d4 === 0 ? `  ✓ ${t4} 组逐位一致` : `  ✗ ${d4}/${t4}`);

// ⑤ N1 落差连续性(elev 0→2): 新 vs 旧
console.log('\n== ⑤ N1 无风落差连续性(elev 0→2 步0.1) ==');
for (const api of [['新', NEW], ['旧', OLD]]) {
  let worst = { g: 0 };
  for (let d = 2; d <= 22; d += 2) {
    let prev = null;
    for (let e = 0; e <= 2.001; e += 0.1) {
      const r = solve(api[1], 'right', 1, d, 0, 0, e);
      if (prev && r) { const g = Math.abs(r.angle - prev.angle); if (g > worst.g) worst = { g, d, e: +e.toFixed(1) }; }
      prev = r;
    }
  }
  console.log(`  ${api[0]}: max=${worst.g.toFixed(3)}° @d=${worst.d},e=${worst.e}`);
}
