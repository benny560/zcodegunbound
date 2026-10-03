// 生成 left N1 的 n1TimeGravityTable 数据 + timePhysicsNoWindT 线性拟合系数
// 物理反推口径与 right:1 完全一致:
//   V = power / PF,  xDist = sd * 40,  T_real = xDist / (V*cos(angle)),  G = 2*V*sin(angle) / T_real
// 用户提供的 10 个锚点(sd 1-10), 在相邻锚点间线性插值 angle/power(步长0.1), 再反推 T/G
//
// ★关键修正(2026-08-04): calcTimePhysicsSolver 的 N1 分支在无风时也加 dT=0.0243 偏置
//   (dT = 0.0243 - 0.00066*wy_acc, 无风 wy_acc=0 → dT=0.0243).
//   right N1 无风走识别表路径(calcNoWindFromTable)不受影响, 但 left N1 无识别表只能走求解器,
//   若直接存 T_real 会导致 T_target = T_real + 0.0243 偏大 → 角度系统性偏高 1-2°.
//   修复: 存入表的 T_base = T_real - dT_noWind, 使求解器 T_target = T_base + 0.0243 = T_real 精确复现.
//   G 不变(重力不受 dT 影响).
// 用法: node _gen_leftn1.cjs
const PF = 0.004332712;
const DPP = 40; // DISTANCE_PIXELS_PER_20SD (sdParts=20 时 xDist = sd*40)
const dT_noWind = 0.0243; // calcTimePhysicsSolver 无风时的 dT 偏置
const deg = a => a * Math.PI / 180;
const r4 = x => Math.round(x * 10000) / 10000;
const r2 = x => Math.round(x * 100) / 100;

// 用户 left N1 锚点 [sd, angle, power]
const anchors = [
    [1, 80.3, 0.96],
    [2, 69,   0.96],
    [3, 56.9, 1.00],
    [4, 45,   1.11],
    [5, 34.9, 1.28],
    [6, 26.5, 1.51],
    [7, 19.9, 1.83],
    [8, 14.8, 2.22],
    [9, 10.9, 2.72],
    [10, 7.9, 3.35],
];

// 反推 T 和 G(无风, elev=0). T_base = T_real - dT_noWind (预补偿求解器无风dT偏置)
function reverse(sd, angle, power) {
    const V = power / PF;
    const xDist = sd * DPP;
    const T_real = xDist / (V * Math.cos(deg(angle)));
    const T = T_real - dT_noWind; // ★存入表的 T_base, 求解器加 dT 后还原为 T_real
    const G = 2 * V * Math.sin(deg(angle)) / T_real; // G 用真实 T 算(物理重力)
    return { V, T, T_real, G };
}

console.log('========== ① 10 锚点反推 T/G ==========');
console.log('sd | angle | power | V | T_real | T_base(存表) | G');
const anchorRows = anchors.map(([sd, angle, power]) => {
    const r = reverse(sd, angle, power);
    console.log(`${sd} | ${angle} | ${power} | ${r.V.toFixed(1)} | ${r.T_real.toFixed(4)} | ${r.T.toFixed(4)} | ${r.G.toFixed(2)}`);
    return { sd, angle, power, ...r };
});
const Gs = anchorRows.map(a => a.G);
const Ts = anchorRows.map(a => a.T_real);
console.log(`G 范围: ${Math.min(...Gs).toFixed(2)} ~ ${Math.max(...Gs).toFixed(2)}  (right:1 参考 374~474)`);
console.log(`T_real 范围: ${Math.min(...Ts).toFixed(4)} ~ ${Math.max(...Ts).toFixed(4)}  (right:1 参考 1.00~1.78)`);
console.log(`T_base(存表) = T_real - 0.0243 (预补偿求解器无风dT偏置)`);

console.log('\n========== ② 相邻锚点线性插值(步长0.1) ==========');
const pts = [];
for (let i = 0; i < anchors.length - 1; i++) {
    const [s0, a0, p0] = anchors[i];
    const [s1, a1, p1] = anchors[i + 1];
    const startK = Math.round(s0 * 10);
    const endK = Math.round(s1 * 10);
    // 第一段含起点, 后续段跳过起点(避免重复)
    for (let k = (i === 0 ? startK : startK + 1); k <= endK; k++) {
        const sd = k / 10;
        const t = (sd - s0) / (s1 - s0);
        const angle = a0 + (a1 - a0) * t;
        const power = p0 + (p1 - p0) * t;
        const r = reverse(sd, angle, power);
        pts.push({ sd, angle, power, ...r });
    }
}
console.log(`总插值点数: ${pts.length}  (sd ${pts[0].sd} ~ ${pts[pts.length - 1].sd})`);

// 单调性校验
let angleMono = true, powerMono = true;
for (let i = 1; i < pts.length; i++) {
    if (pts[i].angle > pts[i - 1].angle + 1e-9) angleMono = false;
    if (pts[i].power < pts[i - 1].power - 1e-9) powerMono = false;
}
console.log(`angle 单调递减: ${angleMono}  (80.3°→7.9°)`);
console.log(`power 单调递增: ${powerMono}  (0.96→3.35)`);
const iT = pts.map(p => p.T), iG = pts.map(p => p.G);
console.log(`插值 T 范围: ${Math.min(...iT).toFixed(4)} ~ ${Math.max(...iT).toFixed(4)}`);
console.log(`插值 G 范围: ${Math.min(...iG).toFixed(2)} ~ ${Math.max(...iG).toFixed(2)}`);

console.log('\n========== ③ timePhysicsNoWindT 线性拟合 T = a + b*sd ==========');
// 最小二乘拟合(用 10 锚点的 T, 与 right:1 同方法)
const n = anchorRows.length;
const Sx = anchorRows.reduce((s, a) => s + a.sd, 0);
const Sy = anchorRows.reduce((s, a) => s + a.T, 0);
const Sxx = anchorRows.reduce((s, a) => s + a.sd * a.sd, 0);
const Sxy = anchorRows.reduce((s, a) => s + a.sd * a.T, 0);
const b = (n * Sxy - Sx * Sy) / (n * Sxx - Sx * Sx);
const a = (Sy - b * Sx) / n;
let SSres = 0, SStot = 0;
const Tmean = Sy / n;
anchorRows.forEach(p => {
    SSres += Math.pow(p.T - (a + b * p.sd), 2);
    SStot += Math.pow(p.T - Tmean, 2);
});
const R2 = 1 - SSres / SStot;
const MAE = anchorRows.reduce((s, p) => s + Math.abs(p.T - (a + b * p.sd)), 0) / n;
console.log(`a = ${a.toFixed(4)}, b = ${b.toFixed(5)}, R2 = ${R2.toFixed(4)}, MAE = ${MAE.toFixed(4)}s`);
console.log(`残差: ${anchorRows.map(p => `sd${p.sd}=${r4(p.T - (a + b * p.sd))}`).join(', ')}`);
console.log(`right:1 参考: a=1.7998, b=-0.04357`);

console.log('\n========== ④ 输出可直接粘贴到 HTML 的数据 ==========');
// timePhysicsNoWindT 条目
console.log("-- timePhysicsNoWindT 新增条目 --");
console.log(`'left:1': {a: ${a.toFixed(4)}, b: ${b.toFixed(5)}},`);

// n1TimeGravityTable 条目
console.log('\n-- n1TimeGravityTable 新增条目 (单行, 与 right:1 同格式) --');
const tableStr = pts.map(p => `[${p.sd.toFixed(1)},${r4(p.T)},${r2(p.G)}]`).join(',');
console.log(`'left:1': [${tableStr}],`);

console.log('\n========== ⑤ 对照 right:1 sd=1 ==========');
const L = reverse(1, 80.3, 0.96);
const R = reverse(1, 86, 1.6);
console.log(`Left  sd=1 (80.3°/0.96): V=${L.V.toFixed(1)} T=${L.T.toFixed(4)} G=${L.G.toFixed(2)}`);
console.log(`Right sd=1 (86°/1.6):    V=${R.V.toFixed(1)} T=${R.T.toFixed(4)} G=${R.G.toFixed(2)}`);
console.log(`(right:1 表 sd=1 参考值: T=1.5528 G=474.48 — 反推法一致)`);
console.log(`T_L/T_R = ${(L.T / R.T).toFixed(3)}  (left N1 时间更短, 因角度低+力度小)`);
console.log(`G_L/G_R = ${(L.G / R.G).toFixed(3)}  (等效重力同量级)`);
