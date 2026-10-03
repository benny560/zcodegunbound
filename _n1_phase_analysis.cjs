// N1 相位感知分析: 把三球相位命中约束加进来(用户指正: sd10 的 53° 族三球不可能全中, 断崖是物理的)
// 判据与求解器 scoreEmpiricalPhaseCandidate 完全一致: 侧弹=中心±R·min(2t,1)·(cos ωt,sin ωt),
// 对敌 hitbox(40x33) 求全程最近距, side1Min/side2Min ≤ R(35) 判三球全中.
const fs = require('fs');
const PF = 0.004332712;
const R = 35, RAMP = 2, HW = 40, HH = 33, OMA = 0.023623, OMB = 0.764315;
const table = JSON.parse(fs.readFileSync('_ident_table.json', 'utf8')).R1;

// G(sd) 用数据稳健拟合(上一轮): 417.6 - 1.47·sd
const Gat = sd => 417.6 - 1.47 * sd;

// 给定 sd 与角度: 弹道学定出 V/T, 再算三球相位命中指标
function evalCandidate(sd, angleDeg, G) {
    const a = angleDeg * Math.PI / 180;
    const range = sd * 40;
    const s2 = Math.sin(2 * a);
    if (s2 <= 0) return null;
    const V = Math.sqrt(range * G / s2);
    const T = 2 * V * Math.sin(a) / G;
    const omega = OMA * Math.pow(V, OMB);
    const turns = omega * T / (2 * Math.PI);
    // 中心弹抛物线 + 侧弹旋转, 全程对 hitbox 最近距 (角度修正: 右攻 rot 为负, 与求解器一致)
    const steps = 300;
    let s1min = Infinity, s2min = Infinity;
    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * T;
        const cx = V * Math.cos(a) * t, cy = V * Math.sin(a) * t - 0.5 * G * t * t;
        const rot = -omega * t; // right
        const of = Math.min(RAMP * t, 1);
        for (const sign of [1, -1]) {
            const bx = cx + sign * R * of * Math.cos(rot);
            const by = cy + sign * R * of * Math.sin(rot);
            const nx = Math.max(range - HW / 2, Math.min(bx, range + HW / 2));
            const ny = Math.max(0, Math.min(by, HH));
            const d = Math.hypot(bx - nx, by - ny);
            if (sign === 1) s1min = Math.min(s1min, d); else s2min = Math.min(s2min, d);
        }
    }
    return { angle: angleDeg, power: V * PF, T, turns, s1min, s2min, maxMiss: Math.max(s1min, s2min), allHit: s1min <= R && s2min <= R };
}

console.log('=== 1. 识别表逐点验证: 三球是否全中 (用表自身 angle/power 隐含的 V/T) ===');
console.log('sd | 表角 力 | turns | side1Min side2Min | 全中?');
for (const pt of table) {
    // 用表的实际值(不经 G 模型): V=power/PF, T=sd*40/(VcosA)
    const a = pt.angle * Math.PI / 180;
    const V = pt.power / PF;
    const T = pt.sd * 40 / (V * Math.cos(a));
    const G = 2 * V * Math.sin(a) / T;
    const r = evalCandidate(pt.sd, pt.angle, G);
    console.log(`${String(pt.sd).padStart(2)} | ${String(pt.angle).padStart(3)} ${pt.power.toFixed(2)} | ${r.turns.toFixed(2)} | ${r.s1min.toFixed(0).padStart(5)} ${r.s2min.toFixed(0).padStart(5)} | ${r.allHit ? '✓' : '✗ MISS'}`);
}

console.log('\n=== 2. sd=10 断崖验证: 43°族 vs 53°族(延续) 谁能三球全中 ===');
for (const ang of [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54]) {
    const r = evalCandidate(10, ang, Gat(10));
    console.log(`sd10 角${ang}: turns=${r.turns.toFixed(2)} maxSideMiss=${r.maxMiss.toFixed(0).padStart(4)} ${r.allHit ? '✓全中' : '✗'}`);
}
console.log('sd9 对照:');
for (const ang of [49, 51, 53, 55]) {
    const r = evalCandidate(9, ang, Gat(9));
    console.log(`sd9  角${ang}: turns=${r.turns.toFixed(2)} maxSideMiss=${r.maxMiss.toFixed(0).padStart(4)} ${r.allHit ? '✓全中' : '✗'}`);
}

console.log('\n=== 3. 相位感知稳定求解器: 每 sd 扫角度(5..89°, 0.1°), 三球全中带内取 maxSideMiss 最小 ===');
function phaseSolve(sd) {
    const G = Gat(sd);
    let best = null;
    const bands = [];
    let inBand = false, bandStart = 0;
    for (let ang = 5; ang <= 89.01; ang += 0.1) {
        const r = evalCandidate(sd, ang, G);
        if (!r || r.turns >= 1 || r.turns <= 0) { if (inBand) { bands.push([bandStart, ang - 0.1]); inBand = false; } continue; }
        if (r.allHit) {
            if (!inBand) { inBand = true; bandStart = ang; }
            if (!best || r.maxMiss < best.maxMiss) best = r;
        } else if (inBand) { bands.push([bandStart, ang - 0.1]); inBand = false; }
    }
    if (inBand) bands.push([bandStart, 89]);
    return { best, bands };
}
console.log('sd | 表(角 力) | 相位解(角 力) | Δ角 Δ力 | 全中角度带');
let sA = 0, sP = 0, n = 0; const solvedAngles = [];
for (const pt of table) {
    const { best, bands } = phaseSolve(pt.sd);
    if (!best) { console.log(`${pt.sd}: 无全中解! bands=${JSON.stringify(bands)}`); solvedAngles.push(null); continue; }
    const dA = best.angle - pt.angle, dP = best.power - pt.power;
    sA += Math.abs(dA); sP += Math.abs(dP); n++;
    solvedAngles.push(best.angle);
    const bandStr = bands.map(b => `${b[0].toFixed(0)}~${b[1].toFixed(0)}`).join(',');
    console.log(`${String(pt.sd).padStart(2)} | ${String(pt.angle).padStart(3)} ${pt.power.toFixed(2)} | ${best.angle.toFixed(1).padStart(5)} ${best.power.toFixed(3)} | ${dA >= 0 ? '+' : ''}${dA.toFixed(1)} ${dP >= 0 ? '+' : ''}${dP.toFixed(3)} | ${bandStr}`);
}
console.log(`\n相位解 vs 表: 角度MAE=${(sA / n).toFixed(2)}° 力度MAE=${(sP / n).toFixed(3)} (n=${n})`);

// 平滑度(带内): 二阶差分, 跳过换族点
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const diffs2 = [];
for (let i = 1; i < solvedAngles.length - 1; i++) {
    if (solvedAngles[i - 1] == null || solvedAngles[i] == null || solvedAngles[i + 1] == null) continue;
    const d2 = solvedAngles[i - 1] - 2 * solvedAngles[i] + solvedAngles[i + 1];
    if (Math.abs(d2) < 8) diffs2.push(d2); // 换族点(大跳)另计
}
console.log(`带内二阶差分RMS=${Math.sqrt(mean(diffs2.map(x => x * x))).toFixed(2)}°`);

console.log('\n=== 4. 断崖区小数距离: 相位解 sd 8.5→11.5 步长0.25 (换族应是一次干脆跳变) ===');
for (let sd = 8.5; sd <= 11.5001; sd += 0.25) {
    const { best } = phaseSolve(sd);
    console.log(`${sd.toFixed(2)} | ${best ? best.angle.toFixed(1).padStart(5) + ' ' + best.power.toFixed(3) + ' turns=' + best.turns.toFixed(2) + ' miss=' + best.maxMiss.toFixed(0) : '无解'}`);
}
