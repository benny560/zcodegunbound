// N1 识别数据物理自洽分析: 逐点反推隐含 V/T/G/落地相位, 定位波动源, 评估能否推出稳定求解器
const fs = require('fs'), vm = require('vm');
const p = 'gunbound_calculator.html';
const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
const api = sb.__api;

const PF = 0.004332712;             // power = V * PF
const table = JSON.parse(fs.readFileSync('_ident_table.json', 'utf8'));
const R1 = table.R1;                 // 无风/落差0 的右攻 N1 识别数据

console.log('=== 1. 逐点隐含物理量 (V=power/PF; T=sd*40/(V*cosA); G=2*V*sinA/T) ===');
console.log('sd | angle power |    V    |   T    |   G    | 相位rot_pi(按ω幂律=0.023623*V^0.764315, rot=ωT/π)');
const rows = [];
for (const pt of R1) {
    const a = pt.angle * Math.PI / 180;
    const V = pt.power / PF;
    const T = pt.sd * 40 / (V * Math.cos(a));
    const G = 2 * V * Math.sin(a) / T;
    const omega = 0.023623 * Math.pow(V, 0.764315);
    const rotPi = omega * T / Math.PI;
    rows.push({ sd: pt.sd, angle: pt.angle, power: pt.power, V, T, G, rotPi });
    console.log(`${String(pt.sd).padStart(2)} | ${String(pt.angle).padStart(4)} ${pt.power.toFixed(2)} | ${V.toFixed(1).padStart(7)} | ${T.toFixed(3).padStart(6)} | ${G.toFixed(1).padStart(6)} | ${rotPi.toFixed(3)}`);
}

// G 的稳定性 = 数据自洽度
const Gs = rows.map(r => r.G);
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const std = a => { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };
console.log(`\nG: mean=${mean(Gs).toFixed(1)} std=${std(Gs).toFixed(1)} (变异${(std(Gs) / mean(Gs) * 100).toFixed(1)}%)  min=${Math.min(...Gs).toFixed(1)} max=${Math.max(...Gs).toFixed(1)}`);

// 角度序列的二阶差分 = 波动度量
const seconds = [];
for (let i = 1; i < rows.length - 1; i++) seconds.push(rows[i - 1].angle - 2 * rows[i].angle + rows[i + 1].angle);
console.log(`角度二阶差分: RMS=${Math.sqrt(mean(seconds.map(x => x * x))).toFixed(2)}° 最大|Δ²|=${Math.max(...seconds.map(Math.abs)).toFixed(1)}°`);

console.log('\n=== 2. 当前求解器 N1 输出 vs 识别表 (sd 1..22, 无风落差0) ===');
let sumA = 0, sumP = 0, n = 0, worst = [];
const solverAngles = [];
for (const pt of R1) {
    const all = api.searchTrico3in1Physics(pt.sd, 20, 'right', 0, 0, 0) || [];
    const sol = all.find(x => x.spinN === 1);
    if (!sol) { console.log(`sd=${pt.sd}: 无解`); solverAngles.push(null); continue; }
    const dA = sol.angle - pt.angle, dP = sol.power - pt.power;
    sumA += Math.abs(dA); sumP += Math.abs(dP); n++;
    worst.push({ sd: pt.sd, dA, dP });
    solverAngles.push(sol.angle);
}
worst.sort((a, b) => Math.abs(b.dA) - Math.abs(a.dA));
console.log(`角度MAE=${(sumA / n).toFixed(2)}° 力度MAE=${(sumP / n).toFixed(3)} (n=${n})`);
console.log('偏差最大5条:', worst.slice(0, 5).map(w => `sd${w.sd}: Δ角${w.dA.toFixed(1)} Δ力${w.dP.toFixed(2)}`).join(' | '));

// 求解器自身平滑度
const sa = solverAngles.filter(x => x != null);
const s2 = []; for (let i = 1; i < sa.length - 1; i++) s2.push(sa[i - 1] - 2 * sa[i] + sa[i + 1]);
console.log(`求解器角度二阶差分RMS=${Math.sqrt(mean(s2.map(x => x * x))).toFixed(2)}°`);

console.log('\n=== 3. 平滑重建: 拟合 G=const + rot_pi(sd)二次多项式, 反解 (angle,power) ===');
// 剔除断崖异常点后拟合 rot_pi(sd) (稳健: 先全拟合, 再剔除残差>2σ重拟合)
function fitQuad(pts) {
    // 最小二乘 y = c0 + c1 x + c2 x^2
    let S = [0, 0, 0, 0, 0], Sy = [0, 0, 0];
    for (const { x, y } of pts) { let xp = 1; for (let k = 0; k <= 4; k++) { S[k] += xp; if (k <= 2) Sy[k] += y * xp; xp *= x; } }
    const A = [[S[0], S[1], S[2]], [S[1], S[2], S[3]], [S[2], S[3], S[4]]];
    const b = [Sy[0], Sy[1], Sy[2]];
    // 高斯消元
    for (let i = 0; i < 3; i++) {
        let mx = i; for (let j = i + 1; j < 3; j++) if (Math.abs(A[j][i]) > Math.abs(A[mx][i])) mx = j;
        [A[i], A[mx]] = [A[mx], A[i]]; [b[i], b[mx]] = [b[mx], b[i]];
        for (let j = i + 1; j < 3; j++) { const f = A[j][i] / A[i][i]; for (let k = i; k < 3; k++) A[j][k] -= f * A[i][k]; b[j] -= f * b[i]; }
    }
    const c = [0, 0, 0];
    for (let i = 2; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < 3; k++) s -= A[i][k] * c[k]; c[i] = s / A[i][i]; }
    return c;
}
let phasePts = rows.map(r => ({ x: r.sd, y: r.rotPi }));
let cf = fitQuad(phasePts);
let resid = phasePts.map(p => p.y - (cf[0] + cf[1] * p.x + cf[2] * p.x * p.x));
const sg = std(resid);
const kept = phasePts.filter((p, i) => Math.abs(resid[i]) <= 2 * sg);
cf = fitQuad(kept);
// G 改稳健线性拟合 G(sd)=g0+g1·sd (隐含G随距离缓降 410→375, 常数G会给力度尾段+0.1系统偏差)
function fitLin(pts) { const n = pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const { x, y } of pts) { sx += x; sy += y; sxx += x * x; sxy += x * y; } const g1 = (n * sxy - sx * sy) / (n * sxx - sx * sx); return [sy / n - g1 * sx / n, g1]; }
let gPts = rows.map(r => ({ x: r.sd, y: r.G }));
let gc = fitLin(gPts);
let gRes = gPts.map(p => p.y - (gc[0] + gc[1] * p.x));
const gSg = std(gRes);
const gKept = gPts.filter((p, i) => Math.abs(gRes[i]) <= 2 * gSg);
gc = fitLin(gKept);
const Gat = (sd) => gc[0] + gc[1] * sd;
console.log(`拟合: G(sd)=${gc[0].toFixed(1)} ${gc[1] >= 0 ? '+' : ''}${gc[1].toFixed(2)}·sd (稳健, 剔${gPts.length - gKept.length}离群), rot_pi(sd)=${cf[0].toFixed(4)} + ${cf[1].toFixed(5)}·sd + ${cf[2].toFixed(6)}·sd² (剔${phasePts.length - kept.length}离群)`);
console.log(`(现行代码 rot_pi N1 = 1.2638 - 0.04410·sd + 0.0019351·sd²)`);

// 反解: 给定 sd, 解三方程组 V cosA T = sd*40; V sinA = 0.5 G T; ω(V) T = rot_pi(sd) π
function solveSmooth(sd) {
    const rp = cf[0] + cf[1] * sd + cf[2] * sd * sd;
    const G = Gat(sd);
    // 消元: tanA = 0.5 G T^2/(sd*40); V = sqrt((sd*40/T)^2+(0.5 G T)^2); 求 T 使 ω(V)T = rp·π
    let lo = 0.2, hi = 6;
    const f = (T) => {
        const vx = sd * 40 / T, vy = 0.5 * G * T;
        const V = Math.hypot(vx, vy);
        return 0.023623 * Math.pow(V, 0.764315) * T - rp * Math.PI;
    };
    if (f(lo) * f(hi) > 0) return null;
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; (f(lo) * f(mid) <= 0) ? hi = mid : lo = mid; }
    const T = (lo + hi) / 2;
    const vx = sd * 40 / T, vy = 0.5 * G * T;
    const V = Math.hypot(vx, vy);
    return { angle: Math.atan2(vy, vx) * 180 / Math.PI, power: V * PF, T };
}
console.log('\nsd | 表(角 力) | 平滑重建(角 力) | Δ角 Δ力');
let smA = 0, smP = 0, smN = 0; const smoothAngles = [];
for (const pt of R1) {
    const r = solveSmooth(pt.sd);
    if (!r) { console.log(`${pt.sd}: 无解`); smoothAngles.push(null); continue; }
    smoothAngles.push(r.angle);
    const dA = r.angle - pt.angle, dP = r.power - pt.power;
    smA += Math.abs(dA); smP += Math.abs(dP); smN++;
    console.log(`${String(pt.sd).padStart(2)} | ${String(pt.angle).padStart(4)} ${pt.power.toFixed(2)} | ${r.angle.toFixed(1).padStart(5)} ${r.power.toFixed(3)} | ${dA >= 0 ? '+' : ''}${dA.toFixed(1)} ${dP >= 0 ? '+' : ''}${dP.toFixed(3)}`);
}
const sm = smoothAngles.filter(x => x != null);
const sm2 = []; for (let i = 1; i < sm.length - 1; i++) sm2.push(sm[i - 1] - 2 * sm[i] + sm[i + 1]);
console.log(`\n平滑重建: 对表 角度MAE=${(smA / smN).toFixed(2)}° 力度MAE=${(smP / smN).toFixed(3)}; 角度二阶差分RMS=${Math.sqrt(mean(sm2.map(x => x * x))).toFixed(2)}°`);
console.log('对比: 表本身二阶差分RMS=' + Math.sqrt(mean(seconds.map(x => x * x))).toFixed(2) + '°, 当前求解器=' + Math.sqrt(mean(s2.map(x => x * x))).toFixed(2) + '°');

console.log('\n=== 4. 断崖区小数距离探针: 当前求解器 sd 8.5→11.5 步长0.25 ===');
console.log('sd | 当前解(角 力) | 平滑重建(角 力)');
let prevA = null, maxStep = 0, maxStepAt = 0;
for (let sd = 8.5; sd <= 11.5001; sd += 0.25) {
    const all = api.searchTrico3in1Physics(sd, 20, 'right', 0, 0, 0) || [];
    const sol = all.find(x => x.spinN === 1);
    const sm = solveSmooth(sd);
    const aStr = sol ? `${sol.angle.toFixed(1).padStart(5)} ${(+sol.power).toFixed(3)}` : '无解';
    const sStr = sm ? `${sm.angle.toFixed(1).padStart(5)} ${sm.power.toFixed(3)}` : '无解';
    if (sol && prevA != null) { const st = Math.abs(sol.angle - prevA); if (st > maxStep) { maxStep = st; maxStepAt = sd; } }
    if (sol) prevA = sol.angle;
    console.log(`${sd.toFixed(2)} | ${aStr} | ${sStr}`);
}
console.log(`当前求解器断崖区最大单步(0.25sd)角度跳变: ${maxStep.toFixed(1)}° @sd≈${maxStepAt.toFixed(2)} (平滑重建同步长应<1.5°)`);
