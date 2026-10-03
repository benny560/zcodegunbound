// 三球相位命中验证: 用解的轨迹复现 scoreEmpiricalPhaseCandidate, 看侧弹是否命中(≤R=35).
// 并做灵敏度: 力度+0.05 / 角度+1° (保持T) 对命中余量的破坏. 用法: node _phase_hit_check.cjs
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13, PF = 0.004332712, R = 35, HBW = 40, HBH = 33;
const api = loadApi('gunbound_calculator.html');
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';
const omegaOf = (V, side) => side === 'left' ? 0.687878 * Math.pow(V, 0.299291) : 0.023623 * Math.pow(V, 0.764315);

// 复现 scoreEmpiricalPhaseCandidate: 给中心弹轨迹, 算两侧弹到目标hitbox的最近距离
function phaseMiss(traj, T, side, targetX, targetY, V) {
  const omega = omegaOf(Math.max(1, V), side);
  const mod = side === 'right' ? -1 : 1;
  const last = traj.length - 1;
  let s1 = Infinity, s2 = Infinity;
  for (let i = 0; i <= last; i++) {
    const p = traj[i], t = (i / last) * T;
    const rot = omega * t * mod, off = Math.min(2 * t, 1);
    const c = R * off * Math.cos(rot), s = R * off * Math.sin(rot);
    for (const [bx, by, which] of [[p.x + c, p.y + s, 1], [p.x - c, p.y - s, 2]]) {
      const nx = Math.max(targetX - HBW / 2, Math.min(bx, targetX + HBW / 2));
      const ny = Math.max(targetY, Math.min(by, targetY + HBH));
      const d = Math.hypot(bx - nx, by - ny);
      if (which === 1) s1 = Math.min(s1, d); else s2 = Math.min(s2, d);
    }
  }
  return { s1, s2, maxMiss: Math.max(s1, s2) };
}
// 用给定 V/angle/T 重建中心弹轨迹(内部单位, 同求解器)
function buildTraj(V, angleDeg, T, xA, effGrav) {
  const a = angleDeg * Math.PI / 180, vx = V * Math.cos(a), vy = V * Math.sin(a), tr = [];
  for (let i = 0; i <= 200; i++) { const t = (i / 200) * T; tr.push({ x: vx * t + 0.5 * xA * t * t, y: vy * t - 0.5 * effGrav * t * t }); }
  return tr;
}

const rows = [];
for (const d of data) {
  const all = api.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || [];
  const r = all.find(x => x.spinN === d.n); if (!r) continue;
  const cr = r.centerResult; if (!cr || !cr.trajectory) continue;
  const side = sk(d), T = parseFloat(cr.time), V = parseFloat(cr.power) / PF;
  const xA = parseFloat(cr.xA) || 0, eg = parseFloat(cr.effectiveGravity) || 430;
  const sd = Math.abs(d.distance), targetX = d.distance * 40, targetY = (d.elevation || 0) * EPPU;  // 背射目标在身后, x取带符号
  const base = phaseMiss(cr.trajectory, T, side, targetX, targetY, V);
  const turns = omegaOf(Math.max(1, V), side) * T / (2 * Math.PI);
  // 灵敏度: 力度+0.05 (V变, 保持angle&T不重解) ; 角度+1° (保持power&T)
  const pP = phaseMiss(buildTraj((r.power + 0.05) / PF, r.angle, T, xA, eg), T, side, targetX, targetY, (r.power + 0.05) / PF);
  const pA = phaseMiss(buildTraj(V, r.angle + 1, T, xA, eg), T, side, targetX, targetY, V);
  rows.push({ side: d.side, n: d.n, dist: d.distance, base, turns, dMissP: pP.maxMiss - base.maxMiss, dMissA: pA.maxMiss - base.maxMiss, hit: base.s1 <= R && base.s2 <= R });
}

const mean = a => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const max = a => a.reduce((s, x) => Math.max(s, x), -Infinity);
console.log('==================== 三球相位命中验证 (当前 v1.14 解) ====================\n');
const hitN = rows.filter(r => r.hit).length;
console.log(`1. 三球全中(两侧弹 side1Min & side2Min 均 ≤ R=35px≈0.9SD): ${hitN}/${rows.length} (${(100 * hitN / rows.length).toFixed(0)}%)`);
console.log(`   maxSideMiss(较差那颗侧弹的脱靶px): mean=${mean(rows.map(r => r.base.maxMiss)).toFixed(1)}px  max=${max(rows.map(r => r.base.maxMiss)).toFixed(1)}px  (换算SD: mean=${(mean(rows.map(r => r.base.maxMiss)) / 40).toFixed(2)} max=${(max(rows.map(r => r.base.maxMiss)) / 40).toFixed(2)})`);
console.log('\n2. 分组 maxSideMiss(px) 与 turns(圈数):');
console.log('组       n   maxMiss均  maxMiss最大 | turns均  turns范围         区间');
const grp = {}; for (const r of rows) { (grp[`${r.side}N${r.n}`] = grp[`${r.side}N${r.n}`] || []).push(r); }
const RANGE = { 1: '(0,1)', 2: '(1.1,1.9)', 3: '(2.1,2.9)', 4: '(3.1,3.9)' };
for (const k of Object.keys(grp).sort()) {
  const g = grp[k], ts = g.map(r => r.turns);
  console.log(`${k.padEnd(7)} ${String(g.length).padStart(2)}   ${mean(g.map(r => r.base.maxMiss)).toFixed(1).padStart(7)}   ${max(g.map(r => r.base.maxMiss)).toFixed(1).padStart(7)}   | ${mean(ts).toFixed(2).padStart(5)}  [${Math.min(...ts).toFixed(2)},${Math.max(...ts).toFixed(2)}]   N${k.slice(-1)}${RANGE[k.slice(-1)]}`);
}
console.log('\n3. 灵敏度(命中余量破坏, maxSideMiss 增量):');
console.log(`   力度 +0.05 (保持角度/T): maxSideMiss 平均 +${mean(rows.map(r => r.dMissP)).toFixed(1)}px  最大 +${max(rows.map(r => r.dMissP)).toFixed(1)}px`);
console.log(`   角度 +1°   (保持力度/T): maxSideMiss 平均 +${mean(rows.map(r => r.dMissA)).toFixed(1)}px  最大 +${max(rows.map(r => r.dMissA)).toFixed(1)}px`);
const miss = rows.filter(r => !r.hit);
if (miss.length) { console.log(`\n⚠ 有 ${miss.length} 条当前解侧弹脱靶(>35px):`); for (const r of miss) console.log(`  ${r.side}N${r.n} dist=${r.dist} maxMiss=${r.base.maxMiss.toFixed(1)}px turns=${r.turns.toFixed(2)}`); }
else console.log('\n✓ 全部 67 条当前解, 三球均命中(侧弹 ≤35px)');
