// v1.48 右N3识别数据重标定 回归验证:
// ① 右N3无风解 == 识别表R3 (0偏差)
// ② 其他 side/N 全距离多环境 新旧逐位不变
// ③ 右N3 有风解不变(有风路径独立) + ws=0 vs ws=1 连续性
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
const NEW = loadApi('gunbound_calculator.html');
const OLD = loadApi('gunbound_calculator.before_rightN3_ident.html');
const R3 = JSON.parse(fs.readFileSync('_ident_table.json', 'utf8')).R3;

function solve(api, side, n, d, wa, ws, elevUi) {
  const all = api.searchTrico3in1Physics(d, 20, side, wa, ws, (elevUi || 0) * EPPU) || [];
  return all.find(x => x.spinN === n) || null;
}

// ① 右N3无风 vs 识别表
console.log('== ① 右N3 无风0落差 vs 识别数据R3 ==');
let bad = 0;
for (const row of R3) {
  const r = solve(NEW, 'right', 3, row.sd, 0, 0, 0);
  if (!r) { console.log(`  sd=${row.sd} 无解!`); bad++; continue; }
  const dA = r.angle - row.angle, dP = r.power - row.power;
  if (Math.abs(dA) > 0.001 || Math.abs(dP) > 0.0001) {
    console.log(`  sd=${row.sd}: 求解 ${r.angle}/${r.power} vs 识别 ${row.angle}/${row.power}  ΔA=${dA.toFixed(3)} ΔP=${dP.toFixed(4)}`);
    bad++;
  }
}
console.log(bad === 0 ? `  ✓ 全部 ${R3.length} 点 0 偏差` : `  ✗ ${bad} 点不一致`);

// sd1-2 / 41-50 保留段 + 缺口点(sd5/12)插值检查
console.log('\n== ①b 保留段/缺口点 抽查(新求解器) ==');
for (const sd of [1, 2, 5, 12, 41, 45, 50]) {
  const r = solve(NEW, 'right', 3, sd, 0, 0, 0);
  console.log(`  sd=${sd}: ${r ? r.angle.toFixed(2) + '/' + r.power.toFixed(4) : '无解'}`);
}

// ② 其他 side/N 不变性: 新旧逐位对比
console.log('\n== ② 其他 side/N 不变性(新旧逐位) ==');
const cases = [];
for (const [side, n] of [['right', 1], ['right', 2], ['right', 4], ['left', 2], ['left', 3], ['left', 4]]) {
  for (const d of [3, 8, 15, 22, 30, 38]) {
    for (const env of [[0, 0, 0], [90, 12, 1], [270, 20, -1.5], [180, 8, 0]]) {
      cases.push([side, n, d, ...env]);
    }
  }
}
let diff2 = 0, tested2 = 0;
for (const [side, n, d, wa, ws, el] of cases) {
  const a = solve(NEW, side, n, d, wa, ws, el), b = solve(OLD, side, n, d, wa, ws, el);
  if (!a && !b) continue;
  tested2++;
  if (!a || !b || a.angle !== b.angle || a.power !== b.power) {
    console.log(`  ✗ ${side} N${n} d=${d} wa=${wa} ws=${ws} el=${el}: ${a ? a.angle + '/' + a.power : 'null'} vs ${b ? b.angle + '/' + b.power : 'null'}`);
    diff2++;
  }
}
console.log(diff2 === 0 ? `  ✓ ${tested2} 组逐位一致` : `  ✗ ${diff2}/${tested2} 组有差异`);

// ③ 右N3 有风解不变(有风路径独立)
console.log('\n== ③ 右N3 有风解 新旧对比 ==');
let diff3 = 0, tested3 = 0;
for (const d of [5, 10, 16, 22, 28, 35, 40]) {
  for (const [wa, ws, el] of [[0, 10, 0], [90, 15, 0.5], [180, 20, -1], [270, 8, 1.2], [45, 25, 0]]) {
    const a = solve(NEW, 'right', 3, d, wa, ws, el), b = solve(OLD, 'right', 3, d, wa, ws, el);
    if (!a && !b) continue;
    tested3++;
    if (!a || !b || a.angle !== b.angle || a.power !== b.power) {
      console.log(`  ✗ d=${d} wa=${wa} ws=${ws} el=${el}: ${a ? a.angle + '/' + a.power : 'null'} vs ${b ? b.angle + '/' + b.power : 'null'}`);
      diff3++;
    }
  }
}
console.log(diff3 === 0 ? `  ✓ ${tested3} 组有风解逐位一致` : `  ✗ ${diff3}/${tested3} 组有差异`);

// ④ ws=0 vs ws=1 连续性 (右N3 全距离)
console.log('\n== ④ 右N3 ws=0 vs ws=1 连续性 (0落差, wa=0顺/180逆) ==');
let worst = { gap: 0 };
for (let d = 3; d <= 40; d++) {
  const s0 = solve(NEW, 'right', 3, d, 0, 0, 0);
  for (const wa of [0, 90, 180, 270]) {
    const s1 = solve(NEW, 'right', 3, d, wa, 1, 0);
    if (!s0 || !s1) continue;
    const gap = Math.abs(s1.angle - s0.angle);
    if (gap > worst.gap) worst = { gap, d, wa, a0: s0.angle, a1: s1.angle };
  }
}
console.log(`  最大角度跳变 ${worst.gap.toFixed(2)}° @ sd=${worst.d} wa=${worst.wa} (${(worst.a0 || 0).toFixed(2)} → ${(worst.a1 || 0).toFixed(2)})`);

// 旧版同样口径对照
let worstOld = { gap: 0 };
for (let d = 3; d <= 40; d++) {
  const s0 = solve(OLD, 'right', 3, d, 0, 0, 0);
  for (const wa of [0, 90, 180, 270]) {
    const s1 = solve(OLD, 'right', 3, d, wa, 1, 0);
    if (!s0 || !s1) continue;
    const gap = Math.abs(s1.angle - s0.angle);
    if (gap > worstOld.gap) worstOld = { gap, d, wa };
  }
}
console.log(`  (旧版对照: 最大跳变 ${worstOld.gap.toFixed(2)}° @ sd=${worstOld.d} wa=${worstOld.wa})`);
