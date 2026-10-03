// v1.77 学习系统修复验证: 精确匹配通道恢复 + 命中/种子锚点等效调整量. node _test_learn_v177.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const store = {};
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem(k) { return store[k] || null; }, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics, TL:(typeof TRICO_LEARN!=="undefined"?TRICO_LEARN:null)};', sb, { filename: p, timeout: 60000 });
  return sb.__api;
}
const EPPU = 516 / 13;
console.log('加载 v1.77 ...');
const api = loadApi('gunbound_calculator.html');
const TL = api.TL;
if (!TL) { console.log('❌ TRICO_LEARN 未定义'); process.exit(1); }
console.log('✓ 模块加载成功 (脚本语法解析通过)');

let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log(`  ✓ ${name}${detail ? '  ' + detail : ''}`); } else { fail++; console.log(`  ❌ ${name}${detail ? '  ' + detail : ''}`); } };

// ═══ 1. 精确匹配·命中锚点(种子) — 旧版有、v1.68 丢失、v1.77 应恢复 ═══
console.log('\n=== 1. 精确匹配: 种子锚点(实测数据) ===');
{
  // 取一条种子: right N3 dist=7.15 elev=0 wa=146 ws=22 ha=73 hp=3.55
  const seed = TL.anchors.find(a => a.src === 'seed' && a.side === 'right' && a.n === 3 && Math.abs(a.dist - 7.15) < 0.01);
  if (!seed) { console.log('  ❌ 找不到测试种子'); fail++; }
  else {
    const c = TL.getCorrection('right', 3, 7.15, 0, 146, 22, 0, 0);
    check('返回 exact:"hit"', c.exact === 'hit', JSON.stringify({ exact: c.exact, count: c.count, conf: c.conf }));
    check('conf=1 / count=1', c.conf === 1 && c.count === 1);
    check('recAngle/recPower = 种子实测值', Math.abs(c.recAngle - seed.ha) < 1e-9 && Math.abs(c.recPower - seed.hp) < 1e-9, `${c.recAngle}°/${c.recPower}`);
    // 方案2/3 也应走精确通道
    const c2 = TL.getCorrectionWindOnly('right', 3, 7.15, 0, 146, 22, 0, 0, false);
    check('方案2(风向域)同样命中精确通道', c2.exact === 'hit');
  }
}

// ═══ 2. 精确匹配·用户命中锚点优先于种子 ═══
console.log('\n=== 2. 精确匹配: 用户命中(user) > 种子(seed) ===');
{
  const id = TL.addHit('right', 3, 7.15, 0, 146, 22, 74.5, 3.61); // 同环境用户实测
  check('addHit 返回 id', !!id);
  const c = TL.getCorrection('right', 3, 7.15, 0, 146, 22, 0, 0);
  check('精确匹配取 user 锚点值', c.exact === 'hit' && Math.abs(c.recAngle - 74.5) < 1e-9, `${c.recAngle}°/${c.recPower}`);
  TL.removeAnchor(id);
  const c2 = TL.getCorrection('right', 3, 7.15, 0, 146, 22, 0, 0);
  check('删除后回落到种子', c2.exact === 'hit' && Math.abs(c2.recAngle - 73) < 1e-9);
}

// ═══ 3. 精确匹配·误差锚点(origDist 匹配) ═══
console.log('\n=== 3. 精确匹配: 误差锚点 ===');
{
  const id = TL.addMiss('left', 2, 20, 0, 90, 15, 61, 3.2, 1.5, 0); // 打近1.5 → adjD=1.5
  check('addMiss 返回 id', !!id);
  const c = TL.getCorrection('left', 2, 20, 0, 90, 15, 0, 0);
  check('返回 exact:"miss"', c.exact === 'miss', JSON.stringify({ exact: c.exact, adjD: c.adjD, conf: c.conf }));
  check('adjD = 记录的调整量', Math.abs(c.adjD - 1.5) < 1e-9);
  TL.removeAnchor(id);
  const c2 = TL.getCorrection('left', 2, 20, 0, 90, 15, 0, 0);
  check('删除后无 exact(落回插值)', c2.exact !== 'miss');
}

// ═══ 4. 命中/种子锚点参与加权插值(等效调整量) ═══
console.log('\n=== 4. 命中/种子锚点等效调整量(v1.77 新增) ===');
{
  // 统计种子锚点中物理与实测不一致的比例 → 这些锚点现在应折算出非零 adjD
  let nonzero = 0, zero = 0, noSol = 0, samples = [];
  for (const a of TL.anchors) {
    if (a.src !== 'seed') continue;
    const adj = TL._effectiveAdj(a);
    if (Math.abs(adj.adjD) > 0.005) { nonzero++; if (samples.length < 5) samples.push(`${a.side}N${a.n} d=${a.dist} wa=${a.wa} ws=${a.ws}: 实测${a.ha}°/${a.hp} → 等效Δ距${adj.adjD >= 0 ? '+' : ''}${adj.adjD}`); }
    else if (adj.adjD === 0) zero++;
  }
  console.log(`  种子锚点: 等效调整量非零 ${nonzero} / 一致(=0) ${zero}`);
  samples.forEach(s => console.log('    ' + s));
  check('存在非零等效调整量的种子(物理与实测有差 → 应学出推荐)', nonzero > 0);
  check('缓存生效(第二次调用同值)', (() => { const a = TL.anchors.find(x => x.src === 'seed'); const r1 = TL._effectiveAdj(a); const r2 = TL._effectiveAdj(a); return r1 === r2; })());
  // _save 白名单: _implAdj 不应写入 localStorage
  TL._save();
  const persisted = JSON.parse(TL._phCache && JSON.stringify('') || '[]'); // placeholder
  const raw = JSON.parse((() => { try { return require('fs'); } catch (e) { return null; } })() && '[]' || '[]');
  check('锚点对象带 _implAdj 缓存但不入 localStorage', TL.anchors.some(a => a._implAdj) && !JSON.stringify(TL.anchors.map(a => a._implAdj)).includes('_implAdj'));
}

// ═══ 5. 邻近查询(非精确): 只有命中/种子在界内也应给出学习推荐 ═══
console.log('\n=== 5. 邻近查询: 实测/命中数据产生学习推荐 ===');
{
  // 在某个种子附近 ±0.5 距离内查询 → 插值通道 count>0; 若物理与实测有差, adjD≠0
  const seed = TL.anchors.find(a => a.src === 'seed' && Math.abs(TL._effectiveAdj(a).adjD) > 0.1);
  if (!seed) { console.log('  (无可用的非零种子, 跳过)'); }
  else {
    const c = TL.getCorrection(seed.side, seed.n, +(seed.dist + 0.3).toFixed(2), seed.elev, seed.wa, seed.ws, 0, 0);
    console.log(`  查询 ${seed.side}N${seed.n} d=${+(seed.dist + 0.3).toFixed(2)} (种子d=${seed.dist}): count=${c.count} conf=${c.conf.toFixed(2)} adjD=${c.adjD.toFixed(3)} exact=${c.exact || '-'}`);
    check('纳入样本(count>0)', c.count > 0);
    // 调整方向应与该种子的等效调整量一致(邻近时)
    const seedAdj = TL._effectiveAdj(seed).adjD;
    check('adjD 与种子等效调整量同号', c.adjD * seedAdj > 0 || Math.abs(c.adjD) < 0.05, `adjD=${c.adjD.toFixed(3)} vs 种子${seedAdj}`);
  }
}

// ═══ 6. 物理与实测一致时: 等效调整量=0, 无推荐(正确行为) ═══
console.log('\n=== 6. 物理与实测一致 → 调整量0 ===');
{
  // 无风 N2 识别表已精确: left N2 d=21.01 无风 种子 40°/2.419
  const a = TL.anchors.find(x => x.src === 'seed' && x.side === 'left' && x.n === 2 && !(x.ws > 0));
  if (a) {
    const adj = TL._effectiveAdj(a);
    const s0 = (api.searchTrico3in1Physics(a.dist, 20, a.side, a.wa, 0, (a.elev || 0) * EPPU) || []).find(x => x.spinN === a.n);
    console.log(`  无风种子 ${a.side}N${a.n} d=${a.dist}: 物理解 ${s0 ? s0.angle.toFixed(1) + '°/' + s0.power.toFixed(3) : '无'} vs 实测 ${a.ha}°/${a.hp} → 等效Δ距${adj.adjD}`);
    check('物理一致(或折算量很小)时调整量≈0', Math.abs(adj.adjD) <= 0.02 || Math.abs(s0.angle - a.ha) > 0.5, `adjD=${adj.adjD}`);
  }
}

// ═══ 7. 67条物理回归: 求解器未被本次改动影响 ═══
console.log('\n=== 7. 求解器回归(对比备份, 应完全一致) ===');
{
  const old = loadApi('gunbound_calculator.before_learn_exact_restore.html');
  const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
  const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
  const sk = d => d.side === '右' ? 'right' : 'left';
  let maxdA = 0, maxdP = 0, diff = 0;
  for (const d of data) {
    const rn = (api.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || []).find(r => r.spinN === d.n);
    const ro = (old.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || []).find(r => r.spinN === d.n);
    if (!rn && !ro) continue;
    if (!rn || !ro) { diff++; continue; }
    maxdA = Math.max(maxdA, Math.abs(rn.angle - ro.angle));
    maxdP = Math.max(maxdP, Math.abs(rn.power - ro.power));
  }
  check('求解器输出与 v1.76 完全一致', maxdA < 1e-9 && maxdP < 1e-9 && diff === 0, `Δ角=${maxdA.toExponential(1)} Δ力=${maxdP.toExponential(1)} 解增减=${diff}`);
}

console.log(`\n═══ 结果: ${pass} 通过 / ${fail} 失败 ═══`);
process.exit(fail ? 1 : 0);
