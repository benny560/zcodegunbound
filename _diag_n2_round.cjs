// N2 角化力核查(图1场景: 左攻26.5/落差8/风9@68°) + 风区系统性偏差统计. node _diag_n2_round.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const store = {};
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem(k) { return store[k] || null; }, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={search:searchTrico3in1Physics, cTRP:calcTricoRoundedPower, TL:TRICO_LEARN};', sb, { filename: p, timeout: 60000 });
  return sb.__api;
}
const api = loadApi('gunbound_calculator.html');
const TL = api.TL, cTRP = api.cTRP, search = api.search;
const EPPU = 516 / 13, PF = 0.004332712;

// ═══ 1. N2 行精确核查 ═══
console.log('═══ 1. N2 角化力行核查: 左攻 26.5 / 落差+8 / 风9@68° (effWa=112°逆上风) ═══');
{
  const pr = (search(26.5, 20, 'left', 112, 9, 8 * EPPU) || []).find(r => r.spinN === 2);
  const cr = pr.centerResult;
  const T_raw = parseFloat(cr.time), xA = parseFloat(cr.xA) || 0, g = parseFloat(cr.effectiveGravity);
  const vx = parseFloat(cr.xVelocity), vy = parseFloat(cr.yVelocity);
  const xT = vx * T_raw + 0.5 * xA * T_raw * T_raw, yT = vy * T_raw - 0.5 * g * T_raw * T_raw;
  console.log(`  主解: ${pr.angle.toFixed(3)}° / ${pr.power.toFixed(4)}   T_raw=${T_raw.toFixed(4)} xA=${xA.toFixed(3)} g=${g.toFixed(2)} 落点(x=${xT.toFixed(1)}, y=${yT.toFixed(1)})`);
  for (const ia of [40, 41]) {
    const rp = cTRP({ centerResult: cr, powerRaw: pr.power, spinN: 2, angleRaw: pr.angle }, pr.angle, ia, 20);
    const pv = (typeof rp === 'object') ? rp.power : rp;
    // 复算落点守恒T与纯T守恒两个口径
    const tan = Math.tan(ia * Math.PI / 180);
    const T2 = 2 * (tan * xT - yT) / (g + xA * tan);
    const Tl = Math.sqrt(T2);
    const Vl = (yT + 0.5 * g * T2) / (Math.sin(ia * Math.PI / 180) * Tl);
    const Vt = (yT + 0.5 * g * T_raw * T_raw) / (Math.sin(ia * Math.PI / 180) * T_raw);
    // 正向验证: 用返回力度反推落点残差
    const V = pv / PF;
    const yL = V * Math.sin(ia * Math.PI / 180) * Tl - 0.5 * g * Tl * Tl;
    const xL = V * Math.cos(ia * Math.PI / 180) * Tl + 0.5 * xA * Tl * Tl;
    console.log(`  ${ia}°: 返回力度=${pv.toFixed(4)} | 落点守恒: T=${Tl.toFixed(4)} (ΔT=${(Tl - T_raw).toFixed(4)}) 力=${(Vl * PF).toFixed(4)} | 纯T守恒: 力=${(Vt * PF).toFixed(4)} (落点x偏差=${((Vt * Math.cos(ia * Math.PI / 180) * T_raw + 0.5 * xA * T_raw * T_raw) - xT).toFixed(1)}px)`);
    console.log(`      正向验证(力度${pv.toFixed(4)}@${ia}°): 落点=(${xL.toFixed(1)}, ${yL.toFixed(1)}) 残差=(${(xL - xT).toFixed(2)}, ${(yL - yT).toFixed(2)})px | 分支=${typeof rp === 'object' ? (rp.tConserved ? 'T限幅' : 'obj') : '落点守恒(干净)'}`);
  }
}

// ═══ 2. 种子实测按风区统计物理偏差(_effectiveAdj: 负=物理打远/力度偏大) ═══
console.log('\n═══ 2. 实测种子物理偏差统计(按风区, 右攻系effWa) ═══');
{
  const groups = {};
  for (const a of TL.anchors) {
    if (a.src !== 'seed' || !a.ws) continue;
    const effWa = a.side === 'left' ? (((180 - a.wa) % 360) + 360) % 360 : a.wa;
    const rad = effWa * Math.PI / 180, fx = Math.cos(rad), fy = Math.sin(rad);
    const sec = (fx >= 0 ? '顺' : '逆') + (fy >= 0 ? '上' : '下');
    const adj = TL._effectiveAdj(a).adjD;
    (groups[sec] = groups[sec] || []).push({ a, adj, effWa });
  }
  for (const sec of ['顺上', '顺下', '逆上', '逆下']) {
    const arr = groups[sec] || [];
    if (!arr.length) { console.log(`  ${sec}风: 无样本`); continue; }
    const mean = arr.reduce((s, x) => s + x.adj, 0) / arr.length;
    const meanAbs = arr.reduce((s, x) => s + Math.abs(x.adj), 0) / arr.length;
    console.log(`  ${sec}风: ${arr.length}样本 | 平均Δ距=${mean >= 0 ? '+' : ''}${mean.toFixed(2)} (负=物理偏远/力度偏大) | 平均|Δ|=${meanAbs.toFixed(2)}`);
    arr.forEach(x => console.log(`      ${x.a.side === 'left' ? '左' : '右'}N${x.a.n} d=${x.a.dist} effWa=${Math.round(x.effWa)}° ws=${x.a.ws}: Δ距${x.adj >= 0 ? '+' : ''}${x.adj} (实测${x.a.ha}°/${x.a.hp})`));
  }
}
