// 残差规律分析: 偏差(预测-实测)是否系统性/可修正. 用法: node _residual_analysis.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13, RAD = Math.PI / 180;
const api = loadApi('gunbound_calculator.html');
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';

const R = [];
for (const d of data) {
  const all = api.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === d.n);
  if (!r) continue;
  const wE = eff(d), ws = d.windStrength;
  const force = ws === 0 ? 0 : Math.max(0, ws - 1);
  R.push({
    side: d.side, n: d.n, dist: d.distance, elev: d.elevation || 0, ws, wE,
    cosE: Math.cos(wE * RAD), sinE: Math.sin(wE * RAD),
    fx: force * Math.cos(wE * RAD), fy: force * Math.sin(wE * RAD),
    dA: r.angle - d.angle, dP: r.power - d.power,
    dAr: Math.round(r.angle) - d.angle,  // 取整后角度偏差(游戏角度是整数)
    measA: d.angle, measP: d.power, predA: r.angle, predP: r.power,
  });
}
const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); };
const pearson = (x, y) => { const mx = mean(x), my = mean(y); let c = 0, sx = 0, sy = 0; for (let i = 0; i < x.length; i++) { c += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return c / (Math.sqrt(sx * sy) || 1); };

console.log('==================== 残差规律分析 (预测 - 实测, 带符号) ====================\n');
// 1. 全局偏置(bias): 均值≠0 说明系统性偏, ≈0 说明随机
console.log('--- 1. 全局偏置(mean=系统偏移, std=离散) ---');
for (const [label, sub] of [['全部', R], ['右攻', R.filter(r => r.side === '右')], ['左攻', R.filter(r => r.side === '左')]]) {
  const dA = sub.map(r => r.dA), dP = sub.map(r => r.dP), dAr = sub.map(r => r.dAr);
  console.log(`${label.padEnd(4)}(${String(sub.length).padStart(2)}): Δ角 mean=${mean(dA).toFixed(2).padStart(6)} std=${std(dA).toFixed(2)} | Δ力 mean=${mean(dP).toFixed(4).padStart(7)} std=${std(dP).toFixed(4)} | 取整Δ角 mean=${mean(dAr).toFixed(2).padStart(6)} std=${std(dAr).toFixed(2)}`);
}
// 2. 游戏整数角度命中率
console.log('\n--- 2. 取整角度是否命中实测整数(游戏角度=整数) ---');
const e0 = R.filter(r => Math.abs(r.dAr) < 0.5).length, e1 = R.filter(r => Math.abs(r.dAr) <= 1.0001).length, e2 = R.filter(r => Math.abs(r.dAr) <= 2.0001).length;
console.log(`  角度完全命中(Δ=0): ${e0}/${R.length} (${(100 * e0 / R.length).toFixed(0)}%)  |  ≤1°: ${e1} (${(100 * e1 / R.length).toFixed(0)}%)  |  ≤2°: ${e2} (${(100 * e2 / R.length).toFixed(0)}%)`);
// 3. 相关性: 残差 vs 各特征
console.log('\n--- 3. 残差与特征的相关系数 r (|r|>0.4 才算有规律; +表示同向) ---');
console.log('特征            角度Δ r    力度Δ r');
const feats = [['风力 ws', r => r.ws], ['水平风 fx=(ws-1)cos', r => r.fx], ['垂直风 fy=(ws-1)sin', r => r.fy], ['cos(风向)', r => r.cosE], ['sin(风向)', r => r.sinE], ['距离 dist', r => r.dist], ['落差 elev', r => r.elev], ['旋数 n', r => r.n]];
for (const [name, f] of feats) {
  const rA = pearson(R.map(f), R.map(r => r.dA)), rP = pearson(R.map(f), R.map(r => r.dP));
  const flag = (Math.abs(rA) > 0.4 || Math.abs(rP) > 0.4) ? '  ★' : '';
  console.log(`${name.padEnd(20)}  ${rA.toFixed(2).padStart(6)}    ${rP.toFixed(2).padStart(6)}${flag}`);
}
// 4. 风向分类
console.log('\n--- 4. 按有效风向分类 (逆风cosE<-0.3 / 横风 / 顺风cosE>0.3) ---');
console.log('类别        样本  Δ角mean  Δ力mean');
for (const [label, filt] of [['逆风', r => r.cosE < -0.3], ['横风', r => Math.abs(r.cosE) <= 0.3], ['顺风', r => r.cosE > 0.3]]) {
  const sub = R.filter(filt);
  if (!sub.length) { console.log(`${label}: 无`); continue; }
  console.log(`${label.padEnd(8)}  ${String(sub.length).padStart(3)}   ${mean(sub.map(r => r.dA)).toFixed(2).padStart(6)}   ${mean(sub.map(r => r.dP)).toFixed(4).padStart(7)}`);
}
// 5. 力度偏差与风力强度(仅看强风)
console.log('\n--- 5. 力度残差 分风力档 ---');
for (const [label, filt] of [['ws≤5(弱)', r => r.ws <= 5], ['ws6-15(中)', r => r.ws > 5 && r.ws <= 15], ['ws16-20', r => r.ws > 15 && r.ws <= 20], ['ws>20(强)', r => r.ws > 20]]) {
  const sub = R.filter(filt);
  if (!sub.length) { console.log(`${label}: 无`); continue; }
  console.log(`${label.padEnd(10)} n=${String(sub.length).padStart(2)}  Δ力mean=${mean(sub.map(r => r.dP)).toFixed(4).padStart(7)}  Δ力std=${std(sub.map(r => r.dP)).toFixed(4)}  Δ角mean=${mean(sub.map(r => r.dA)).toFixed(2)}`);
}
// 6. 组内(固定侧,N)残差是否跟风走(组内强相关 -> 可按组风修正)
console.log('\n--- 6. 组内(侧,N) 残差 vs 风 相关性 (n≥6才算; |r|>0.6才算组内强规律) ---');
console.log('组        n   Δ角mean Δ力mean | r(Δ力,fx) r(Δ力,ws) r(Δ角,fy) r(Δ角,fx)');
const gk = {};
for (const r of R) { const k = `${r.side}N${r.n}`; (gk[k] = gk[k] || []).push(r); }
for (const k of Object.keys(gk).sort()) {
  const g = gk[k]; if (g.length < 6) continue;
  const rPfx = pearson(g.map(r => r.fx), g.map(r => r.dP));
  const rPws = pearson(g.map(r => r.ws), g.map(r => r.dP));
  const rAfy = pearson(g.map(r => r.fy), g.map(r => r.dA));
  const rAfx = pearson(g.map(r => r.fx), g.map(r => r.dA));
  const star = [rPfx, rPws, rAfy, rAfx].some(v => Math.abs(v) > 0.6) ? '  ★' : '';
  console.log(`${k.padEnd(8)} ${String(g.length).padStart(2)}  ${mean(g.map(r => r.dA)).toFixed(2).padStart(5)}  ${mean(g.map(r => r.dP)).toFixed(3).padStart(6)} | ${rPfx.toFixed(2).padStart(6)}  ${rPws.toFixed(2).padStart(6)}  ${rAfy.toFixed(2).padStart(6)}  ${rAfx.toFixed(2).padStart(6)}${star}`);
}
