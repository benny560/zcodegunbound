// v1.51 无风落差基线表锚点求解 回归验证
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
const NEW = loadApi('gunbound_calculator.html');                       // v1.51
const OLD = loadApi('gunbound_calculator.before_elev_anchor.html');    // v1.50

function solve(api, side, n, d, wa, ws, elevUi) {
  const all = api.searchTrico3in1Physics(d, 20, side, wa, ws, (elevUi || 0) * EPPU) || [];
  return all.find(x => x.spinN === n) || null;
}

// ① 落差连续性: 全side/N2-4 全距离, elev 0→2 步0.1, 最大相邻步长
console.log('== ① 无风落差连续性 (elev 0→2 步0.1, 相邻步长最大值) ==');
for (const [side, nList, dMax] of [['right', [2, 3, 4], 50], ['left', [2, 3, 4], 42]]) {
  for (const n of nList) {
    let worst = { g: 0 }, worstOld = { g: 0 };
    for (let d = 3; d <= dMax; d += 3) {
      let prevN = null, prevO = null;
      for (let e = 0; e <= 2.001; e += 0.1) {
        const rn = solve(NEW, side, n, d, 0, 0, e), ro = solve(OLD, side, n, d, 0, 0, e);
        if (prevN && rn) { const g = Math.abs(rn.angle - prevN.angle); if (g > worst.g) worst = { g, d, e: +e.toFixed(1) }; }
        if (prevO && ro) { const g = Math.abs(ro.angle - prevO.angle); if (g > worstOld.g) worstOld = { g, d, e: +e.toFixed(1) }; }
        prevN = rn; prevO = ro;
      }
    }
    console.log(`  ${side} N${n}: 新 max=${worst.g.toFixed(3)}° @d=${worst.d},e=${worst.e} | 旧 max=${worstOld.g.toFixed(3)}° @d=${worstOld.d},e=${worstOld.e}`);
  }
}

// ② 平地(elev=0)无风解 逐位不变
console.log('\n== ② 平地无风解 新旧逐位 ==');
let d2 = 0, t2 = 0;
for (const [side, dMax] of [['right', 50], ['left', 42]]) {
  for (const n of [1, 2, 3, 4]) {
    for (let d = 1; d <= dMax; d++) {
      const a = solve(NEW, side, n, d, 0, 0, 0), b = solve(OLD, side, n, d, 0, 0, 0);
      if (!a && !b) continue;
      t2++;
      if (!a || !b || a.angle !== b.angle || a.power !== b.power) { d2++; console.log(`  ✗ ${side} N${n} d=${d}`); }
    }
  }
}
console.log(d2 === 0 ? `  ✓ ${t2} 组逐位一致` : `  ✗ ${d2}/${t2}`);

// ③ 有风解 逐位不变(含带落差)
console.log('\n== ③ 有风解 新旧逐位(含落差) ==');
let d3 = 0, t3 = 0;
for (const side of ['right', 'left']) {
  for (const n of [1, 2, 3, 4]) {
    for (const d of [5, 15, 25, 35]) {
      for (const [wa, ws, el] of [[0, 1, 0.5], [90, 12, 1], [180, 8, -1], [270, 20, 0], [45, 15, 2]]) {
        const a = solve(NEW, side, n, d, wa, ws, el), b = solve(OLD, side, n, d, wa, ws, el);
        if (!a && !b) continue;
        t3++;
        if (!a || !b || a.angle !== b.angle || a.power !== b.power) { d3++; console.log(`  ✗ ${side} N${n} d=${d} wa=${wa} ws=${ws} el=${el}`); }
      }
    }
  }
}
console.log(d3 === 0 ? `  ✓ ${t3} 组逐位一致` : `  ✗ ${d3}/${t3}`);

// ④ elev→0 收敛性: elev=0.001 与 elev=0 差异应≈0
console.log('\n== ④ elev→0 收敛(elev=0.001 vs 0) ==');
let worst4 = { g: 0 };
for (const [side, dMax] of [['right', 50], ['left', 42]]) {
  for (const n of [2, 3, 4]) {
    for (let d = 3; d <= dMax; d += 4) {
      const a = solve(NEW, side, n, d, 0, 0, 0.001), b = solve(NEW, side, n, d, 0, 0, 0);
      if (!a || !b) continue;
      const g = Math.abs(a.angle - b.angle);
      if (g > worst4.g) worst4 = { g, side, n, d };
    }
  }
}
console.log(`  最大差异 ${worst4.g.toFixed(4)}° (${worst4.side} N${worst4.n} d=${worst4.d}) ${worst4.g < 0.01 ? '✓' : '✗'}`);

// ⑤ 用户场景: right N3 d=40 落差 0/0.5/1
console.log('\n== ⑤ 用户场景 right N3 d=40 ==');
for (const e of [0, 0.25, 0.5, 0.75, 1]) {
  const r = solve(NEW, 'right', 3, 40, 0, 0, e);
  console.log(`  el=${e}: ${r ? r.angle.toFixed(2) + '/' + r.power.toFixed(4) + ' [' + ((r.centerResult && r.centerResult.source) || '') + ']' : '无解'}`);
}
