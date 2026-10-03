// Boomer 折射可达性 + 落差符号 决定性实验
const DISTANCE_PIXELS_PER_20SD = 800 / 20;
const ELEVATION_PIXELS_PER_UNIT = 516 / 13;
const EXCEL_VEHICLE = {
  vehicles: { boomer: { name: 'Boomer', gravity: 0.608, massBase: 85, massWindCoeff: 0.005, massType: 'wind_dependent', distanceScale: 0.4, distanceMode: 'scaled', elevationMode: 'raw' } },
  getMass(id, ws) { const v = this.vehicles[id]; return v.massType === 'constant' ? v.massBase : v.massBase - ws * ws * v.massWindCoeff; },
};
function calcExcelWindParams(vehicleId, windAngleDeg, windStrength) {
  const v = EXCEL_VEHICLE.vehicles[vehicleId];
  const mass = EXCEL_VEHICLE.getMass(vehicleId, windStrength);
  const r = windAngleDeg * Math.PI / 180;
  return { xA: Math.cos(r) * windStrength / mass, effGrav: v.gravity - Math.sin(r) * windStrength / mass, windMass: mass };
}
function simBoomerTrajectory(power, angleDeg, wp, elevExcel, dt, tmax) {
  if (dt === undefined) dt = 0.002;
  if (tmax === undefined) tmax = 16;
  const Vo = power, rad = angleDeg * Math.PI / 180, xA = wp.xA, effGrav = wp.effGrav;
  let s = [0, elevExcel, Vo * Math.cos(rad), Vo * Math.sin(rad)];
  const deriv = (st) => [st[2], st[3], xA, -effGrav];
  let t = 0, wentBack = false, prevVx = s[2], maxX = 0, tRev = null;
  let i = 0;
  for (i = 0; i < 200000; i++) {
    const k1 = deriv(s);
    const s2 = s.map((v, j) => v + k1[j] * dt / 2);
    const k2 = deriv(s2);
    const s3 = s.map((v, j) => v + k2[j] * dt / 2);
    const k3 = deriv(s3);
    const s4 = s.map((v, j) => v + k3[j] * dt);
    const k4 = deriv(s4);
    s = s.map((v, j) => v + (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) * dt / 6);
    t += dt;
    if (s[2] < 0 && prevVx >= 0) { wentBack = true; if (tRev === null) tRev = t; }
    prevVx = s[2];
    if (s[0] > maxX) maxX = s[0];
    if (s[1] < 0 && t > dt) break;
    if (t > tmax) break;
  }
  return { landingX: s[0], landingT: t, wentBack, maxX, tRev };
}
const f = (x, n = 3) => Number(x).toFixed(n);
const line = (s) => console.log(s);

// 找最大风力
const MAXW = parseInt(process.argv[2] || '26', 10);

line('='.repeat(80));
line('实验4: 逆风下角度扫描 (sd=33→dist=13.2, power=3.0, 纯逆风 wa=180°, ws=' + MAXW + ')');
line('  landingX>0 且 wentBack = 折射命中前方; landingX<=0 且 wentBack = 打到身后(BS)');
line('='.repeat(80));
{
  const wp = calcExcelWindParams('boomer', 180, MAXW);
  line(`  xA=${f(wp.xA, 5)} effGrav=${f(wp.effGrav, 5)}`);
  line('  角度 |  落地x  | 最大x  | 反号时刻 | 飞行T  | wentBack');
  for (const a of [20, 30, 40, 43, 44, 45, 46, 47, 50, 55, 60, 70, 80, 87]) {
    const r = simBoomerTrajectory(3.0, a, wp, 0);
    line(`  ${String(a).padStart(4)} | ${f(r.landingX).padStart(7)} | ${f(r.maxX).padStart(6)} | ${(r.tRev === null ? '   n/a' : f(r.tRev, 2)).padStart(8)} | ${f(r.landingT, 2).padStart(6)} | ${r.wentBack}`);
  }
}

line('');
line('='.repeat(80));
line('实验5: 全参数域内「折射命中前方」是否可达');
line('  扫描 ws ∈ [1..' + MAXW + '], 角度 ∈ [1..89] 步长0.25°, power=3.0(满力)');
line('  统计 wentBack 轨迹中 landingX 的最大正值 (excel单位); >0 才可能"命中前方"');
line('='.repeat(80));
{
  let bestPos = -Infinity, bestInfo = null;
  const posList = [];
  for (let ws = 1; ws <= MAXW; ws++) {
    const wp = calcExcelWindParams('boomer', 180, ws);
    if (wp.effGrav <= 0 || wp.xA >= 0) continue;
    for (let a = 1; a <= 89; a += 0.25) {
      const r = simBoomerTrajectory(3.0, a, wp, 0, 0.01, 20);
      if (!r.wentBack) continue;
      if (r.landingX > bestPos) { bestPos = r.landingX; bestInfo = { ws, a, ...r }; }
      if (r.landingX > 0) posList.push({ ws, a, x: r.landingX, maxX: r.maxX });
    }
  }
  if (bestInfo) {
    line(`  反射轨迹中 landingX 最大值 = ${f(bestPos)} (excel单位) = ${f(bestPos / 0.4, 2)} sd`);
    line(`    出现在 ws=${bestInfo.ws} angle=${bestInfo.a}° maxX=${f(bestInfo.maxX)} 飞行T=${f(bestInfo.landingT, 2)}s`);
  } else line('  未找到任何 wentBack 轨迹');
  line(`  其中 landingX>0 (真正的"折射命中前方") 的样本数 = ${posList.length}`);
  if (posList.length) {
    posList.sort((p, q) => q.x - p.x);
    line('  最大正值前5个:');
    posList.slice(0, 5).forEach(p => line(`    ws=${p.ws} angle=${p.a}° landingX=${f(p.x)} (=${f(p.x / 0.4, 2)} sd) maxX=${f(p.maxX)}`));
  } else {
    line('  ★结论: 数值模型下"折射后仍命中前方目标"不可达 — 所有反射轨迹都落在 x<=0 (即身后)');
  }
}

line('');
line('='.repeat(80));
line('实验6: 落差符号 决定性对照 (无风, power=3.0, angle=45°)');
line('='.repeat(80));
{
  const wp = calcExcelWindParams('boomer', 0, 0);
  const Vo = 3.0, A = 45, vy = Vo * Math.sin(A * Math.PI / 180), vx = Vo * Math.cos(A * Math.PI / 180);
  const g = wp.effGrav;
  for (const elevUI of [-8, -4, 0, 4, 8]) {
    const elev = elevUI; // elev单位即 UI 落差单位 (elevationMode='raw')
    const sim = simBoomerTrajectory(Vo, A, wp, elev);
    const disc = vy * vy - 2 * g * elev;
    const closed = disc >= 0 ? vx * ((vy + Math.sqrt(disc)) / g) : NaN;
    const flat = vx * (2 * vy / g);
    line(`  落差UI=${String(elevUI).padStart(3)}: 平地落点=${f(flat)}  闭式(目标高度elev)落点=${isNaN(closed) ? ' 不可达' : f(closed)}  数值积分落点=${f(sim.landingX)}`);
  }
  line('  → 物理: 打更高的目标应该"更近或不可达"; 打更低的目标应该"更远".');
  line('  → 闭式解 elev↑ → 落点↓(更近) 符合物理; 数值解 elev↑ → 落点↑(更远) 与物理相反.');
}
