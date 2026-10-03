// 最终验证: BS背射闭式解 + 真折射深度包络
const G = 0.608, IPS = 0.4, ELEV = 516 / 13;
const mass = (w) => 85 - 0.005 * w * w;
const f = (v, n = 3) => Number(v).toFixed(n);
const L = (s) => console.log(s);

// —— 计算器闭式解原样 ——
function calcExcelCenterTrajectory(angle, distance, wa, ws, elevInternal) {
  const rawElevation = elevInternal / ELEV;
  const dist = distance * 0.4;
  const elev = rawElevation;
  const m = mass(ws), r = wa * Math.PI / 180;
  const xA = Math.cos(r) * ws / m, effGrav = G - Math.sin(r) * ws / m;
  if (effGrav <= 0) return null;
  const rad = (angle + 0.00001) * Math.PI / 180;
  const cosA = Math.cos(rad), sinA = Math.sin(rad), tanA = sinA / cosA;
  if (tanA <= 0) return null;
  const excelDist = dist - elev / tanA;
  const denom = (2 * cosA * sinA) / effGrav + (2 * xA * sinA * sinA) / (effGrav * effGrav);
  const v2 = excelDist / denom;
  if (!Number.isFinite(v2) || v2 <= 0) return null;
  return { velocity: Math.sqrt(v2), excelDist, denom };
}
function calcExcelFromPower(power, distance, wa, ws, elevInternal) {
  if (power <= 0) return [];
  const fn = (a) => { const r = calcExcelCenterTrajectory(a, distance, wa, ws, elevInternal); return r ? r.velocity - power : null; };
  const roots = [];
  let pa = 1, pv = fn(pa);
  for (let a = 1.25; a < 89; a += 0.25) {
    const v = fn(a);
    if (pv !== null && v !== null && pv * v < 0) {
      let lo = pa, hi = a;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; const mv = fn(mid); if (mv === null) break; if (fn(lo) * mv <= 0) hi = mid; else lo = mid; }
      roots.push((lo + hi) / 2);
    }
    pa = a; pv = v;
  }
  return roots.filter(a => a > 45);
}
// —— 数值积分(sim 原样) ——
function sim(power, angDeg, wa, ws, elevExcel) {
  const m = mass(ws), r = wa * Math.PI / 180;
  const xA = Math.cos(r) * ws / m, effGrav = G - Math.sin(r) * ws / m;
  if (effGrav <= 0) return null;
  const DT = 0.001;
  let vx = power * Math.cos(angDeg * Math.PI / 180), vy = power * Math.sin(angDeg * Math.PI / 180);
  let x = 0, y = elevExcel || 0, t = 0, wentBack = false, prevVx = vx, maxX = 0;
  for (let i = 0; i < 300000; i++) {
    vx += xA * DT; vy -= effGrav * DT; x += vx * DT; y += vy * DT; t += DT;
    if (vx < 0 && prevVx >= 0) wentBack = true;
    prevVx = vx; if (x > maxX) maxX = x;
    if (y < 0 && t > DT) break; if (t > 20) break;
  }
  return { x, maxX, t, wentBack };
}

L('='.repeat(88));
L('实验10: BS背射在 boomer-modes 里用的闭式解 (calcExcelFromPower, 负距离) 能否出解');
L('='.repeat(88));
for (const ws of [10, 15, 20, 26]) {
  for (const elev of [0, 0]) {
    const roots = calcExcelFromPower(3.0, -13.2, 180, ws, elev);
    const direct = calcExcelCenterTrajectory(50, -13.2, 180, ws, elev);
    L(`  逆风 ws=${String(ws).padStart(2)}: calcExcelFromPower(力3.0, 距离=-13.2) → 解数=${roots.length}  | 单点 calcExcelCenterTrajectory(50°, -13.2) → ${direct ? 'v=' + f(direct.velocity) : 'null (excelDist=' + (direct === null ? '<0 或无解' : '') + ')'}`);
  }
}
{
  const t1 = calcExcelCenterTrajectory(50, -13.2, 180, 20, 0);
  const elev0 = -13.2 * 0.4 - 0 / Math.tan(50 * Math.PI / 180);
  L(`  说明: 负距离时 excelDist = dist - elev/tanA = ${f(elev0)} < 0 → v²=excelDist/denom < 0 → 闭式解恒为 null`);
  L(`  ⇒ boomer-modes 的「BS 背射」在逆风下必然 failReason='impossible' (拿不到任何根)`);
}
L('');
L('  对照: Boomer-Test 的折射/背射走数值积分, 能出解 ——');
for (const ws of [10, 20, 26]) {
  // 目标 -13.2 (身后), 满力找角
  let found = null;
  for (let a = 89; a >= 1; a -= 0.25) {
    const r = sim(3.0, a, 180, ws, 0);
    if (r && Math.abs(r.x - (-13.2)) < 0.05) { found = { a, r }; break; }
  }
  L(`    逆风 ws=${String(ws).padStart(2)}: 数值积分找身后目标(-13.2) → ${found ? `角度 ${f(found.a, 2)}° 落点 ${f(found.r.x)} wentBack=${found.r.wentBack}` : '未找到'}`);
}

L('');
L('='.repeat(88));
L('实验11: 「真折射」深度包络 — 回旋轨迹中 落点在最大前冲点的 X% 以内的才算明显折返');
L('='.repeat(88));
L('  风力 | 折返深度≥30% 的落点区间(sd) | ≥30%折返最远落点(sd) | 该处前冲峰值(sd) | 对应角度');
for (const ws of [6, 10, 14, 18, 22, 26]) {
  const pts = [];
  for (let a = 1; a <= 89; a += 0.1) {
    const r = sim(3.0, a, 180, ws, 0);
    if (!r || !r.wentBack || r.maxX <= 0) continue;
    const depth = (r.maxX - r.x) / r.maxX;
    if (depth >= 0.30 && r.x > 0) pts.push({ a, land: r.x / IPS, peak: r.maxX / IPS, depth });
  }
  if (!pts.length) { L(`  ${String(ws).padStart(4)} | 无`); continue; }
  pts.sort((p, q) => p.land - q.land);
  const far = pts.reduce((b, p) => p.land > b.land ? p : b, pts[0]);
  L(`  ${String(ws).padStart(4)} | ${f(pts[0].land)} ~ ${f(pts[pts.length - 1].land)} sd | ${f(far.land)} | ${f(far.peak)} | ${f(far.a, 1)}° (折返深度${f(far.depth * 100, 0)}%)`);
}
