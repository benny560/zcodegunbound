// v1.78 学习系统修复验证: 无风不生效 + 方案3优先级(先风向门后风力缩放). node _test_learn_v178.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const store = {};
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem(k) { return store[k] || null; }, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={search:searchTrico3in1Physics, TL:(typeof TRICO_LEARN!=="undefined"?TRICO_LEARN:null)};', sb, { filename: p, timeout: 60000 });
  return sb.__api;
}
console.log('加载 v1.78 ...');
const api = loadApi('gunbound_calculator.html');
const TL = api.TL;
if (!TL) { console.log('❌ TRICO_LEARN 未定义'); process.exit(1); }
let pass = 0, fail = 0;
const ck = (n, c, d) => { c ? pass++ : fail++; console.log(`  ${c ? '✓' : '❌'} ${n}${d ? '  ' + d : ''}`); };

// ═══ 1. 无风不生效(用户报告图2: 左攻30/0/无风, N2仍带学习徽章) ═══
console.log('\n=== 1. 无风查询: 三方案学习全部不生效 ===');
{
  // 补一条无风误差锚点(图2场景: 用户无风锚点是非零adj的来源), 验证即便有也不生效
  const id = TL.addMiss('left', 2, 30, 0, 0, 0, 61, 3.2, 1.5, 0);
  const c1 = TL.getCorrection('left', 2, 30, 0, 203, 0, 0, 0);                       // 方案1
  const c2 = TL.getCorrectionWindOnly('left', 2, 30, 0, 203, 0, 0, 0, false);        // 方案2
  const c3 = TL.getCorrectionWindOnly('left', 2, 30, 0, 203, 0, 0, 0, true);         // 方案3
  ck('方案1 无风不生效', c1.count === 0 && !c1.exact && c1.adjD === 0, JSON.stringify({ count: c1.count, adjD: c1.adjD, exact: c1.exact || '-' }));
  ck('方案2 无风不生效', c2.count === 0 && !c2.exact && c2.adjD === 0);
  ck('方案3 无风不生效', c3.count === 0 && !c3.exact && c3.adjD === 0);
  TL.removeAnchor(id);
  // 精确命中锚点(无风)同样不生效
  const id2 = TL.addHit('left', 2, 30, 0, 0, 0, 61, 3.2);
  const ce = TL.getCorrectionWindOnly('left', 2, 30, 0, 203, 0, 0, 0, true);
  ck('无风精确命中锚点也不生效(不显示学习·精确)', ce.count === 0 && !ce.exact);
  TL.removeAnchor(id2);
}

// ═══ 2. 方案3优先级: 先风向域, 后风力缩放 ═══
console.log('\n=== 2. 方案3 优先级判定 ===');
{
  // 风向域外(差103°) + 风力与查询完全相同 → 必须出局, 风力相同不能单独救活
  const idA = TL.addMiss('left', 2, 30, 0, 100, 9, 61, 3.2, 1.5, 0);
  let c = TL.getCorrectionWindOnly('left', 2, 30, 0, 203, 9, 0, 0, true);
  ck('风向域外+风力相同 → 不生效(不单独判风力)', c.count === 0 && c.adjD === 0, 'count=' + c.count);
  TL.removeAnchor(idA);
  // 风向域内(差8°) + 风力18 → 过门后按 查询风/样本风 = 9/18 缩放
  const idB = TL.addMiss('left', 2, 30, 0, 195, 18, 61, 3.2, 2.0, 0);
  c = TL.getCorrectionWindOnly('left', 2, 30, 0, 203, 9, 0, 0, true);
  // 期望: adjD = 2.0 × sim(1-8/15) × wsScale(9/18), 新鲜user锚 srcW=2×timeFactor(≈2) → sw>1.5 → conf=1 不收缩
  const expect = 2.0 * (1 - 8 / 15) * (9 / 18);
  ck('风向域内 → 过门并做风力线性缩放', c.count === 1 && Math.abs(c.adjD - expect) < 1e-9, `adjD=${c.adjD.toFixed(4)} 期望=${expect.toFixed(4)}`);
  TL.removeAnchor(idB);
  // 有风查询的精确匹配通道不受影响(风向仍是硬条件)
  const idC = TL.addHit('left', 2, 30, 0, 203, 9, 61, 3.2);
  c = TL.getCorrectionWindOnly('left', 2, 30, 0, 203, 9, 0, 0, true);
  ck('有风精确匹配通道不受影响', c.exact === 'hit' && c.recAngle === 61, 'exact=' + c.exact);
  TL.removeAnchor(idC);
}

// ═══ 3. 有风行为回归: 与修改前(v1.77)完全一致 ═══
console.log('\n=== 3. 有风查询回归(对比 v1.77 备份, 应完全一致) ===');
{
  const old = loadApi('gunbound_calculator.before_learn_nowind.html');
  const EPPU = 516 / 13;
  const scen = [
    { side: 'left', dist: 26.5, elev: 8, wa: 68, ws: 9 },   // 图1: 左攻 26.5/落差8/风9@68°
    { side: 'right', dist: 26.5, elev: 8, wa: 68, ws: 9 },
    { side: 'left', dist: 30, elev: 0, wa: 203, ws: 9 },
    { side: 'right', dist: 15, elev: -3, wa: 146, ws: 22 },
  ];
  let maxdD = 0, maxdE = 0, cntDiff = 0, exDiff = 0;
  for (const s of scen) for (const mode of ['1', '2', '3']) for (const n of [2, 3, 4]) {
    const effWa = s.side === 'left' ? (((180 - s.wa) % 360) + 360) % 360 : s.wa;
    const rn = (api.search(s.dist, 20, s.side, effWa, s.ws, s.elev * EPPU) || []).find(r => r.spinN === n);
    const ro = (old.search(s.dist, 20, s.side, effWa, s.ws, s.elev * EPPU) || []).find(r => r.spinN === n);
    if (!rn || !ro) continue;
    const cn = mode === '1' ? TL.getCorrection(s.side, n, s.dist, s.elev, s.wa, s.ws, rn.angle, rn.power) : TL.getCorrectionWindOnly(s.side, n, s.dist, s.elev, s.wa, s.ws, rn.angle, rn.power, mode === '3');
    const co = mode === '1' ? old.TL.getCorrection(s.side, n, s.dist, s.elev, s.wa, s.ws, ro.angle, ro.power) : old.TL.getCorrectionWindOnly(s.side, n, s.dist, s.elev, s.wa, s.ws, ro.angle, ro.power, mode === '3');
    maxdD = Math.max(maxdD, Math.abs((cn.adjD || 0) - (co.adjD || 0)));
    maxdE = Math.max(maxdE, Math.abs((cn.adjE || 0) - (co.adjE || 0)));
    if ((cn.count || 0) !== (co.count || 0)) cntDiff++;
    if ((cn.exact || '') !== (co.exact || '')) exDiff++;
  }
  ck('四场景×三方案学习输出与 v1.77 完全一致', maxdD < 1e-12 && maxdE < 1e-12 && cntDiff === 0 && exDiff === 0, `ΔadjD=${maxdD} ΔadjE=${maxdE} count差异=${cntDiff} exact差异=${exDiff}`);
}

console.log(`\n═══ 结果: ${pass} 通过 / ${fail} 失败 ═══`);
process.exit(fail ? 1 : 0);
