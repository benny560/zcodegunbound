// Boomer 弹道公式审计: 逆风折射 vs 顺风形态
// 物理与函数从 gunbound_calculator.html 原样摘录, 不做任何修改
const DISTANCE_PIXELS_PER_20SD = 800 / 20;
const ELEVATION_PIXELS_PER_UNIT = 516 / 13;
const MAX_DISPLAY_POWER = 5;

const EXCEL_VEHICLE = {
  vehicles: {
    boomer: {
      name: 'Boomer', gravity: 0.608, massBase: 85, massWindCoeff: 0.005,
      massType: 'wind_dependent', baseTime: 3.00098, distanceScale: 0.4,
      distanceMode: 'scaled', elevationMode: 'raw',
      forkTimes: { bomb: 3.00098, hook1: 2.928, hook2: 3.110, hook3: 3.388, hook4: 3.613, hook5: 2.603 },
    },
  },
  getMass(vehicleId, windStrength) {
    const v = this.vehicles[vehicleId];
    if (v.massType === 'constant') return v.massBase;
    return v.massBase - windStrength * windStrength * v.massWindCoeff;
  },
};

function getExcelUnits(vehicleId, distance, elevationInternal, sdParts) {
  const v = EXCEL_VEHICLE.vehicles[vehicleId];
  const rawElevation = elevationInternal / ELEVATION_PIXELS_PER_UNIT;
  const dist = v.distanceMode === 'raw' ? distance : distance * v.distanceScale;
  const elev = v.elevationMode === 'raw' ? rawElevation : (5.17 / 16) * rawElevation;
  const xScale = v.distanceMode === 'raw' ? DISTANCE_PIXELS_PER_20SD : DISTANCE_PIXELS_PER_20SD / v.distanceScale;
  const yScale = v.elevationMode === 'raw' ? ELEVATION_PIXELS_PER_UNIT : ELEVATION_PIXELS_PER_UNIT / (5.17 / 16);
  return { v, dist, elev, xScale, yScale };
}

// ★ 当前实现: 直接乘原始风力(无 -1)
function calcExcelWindParams(vehicleId, windAngleDeg, windStrength) {
  const v = EXCEL_VEHICLE.vehicles[vehicleId];
  const mass = EXCEL_VEHICLE.getMass(vehicleId, windStrength);
  const windRad = windAngleDeg * Math.PI / 180;
  const xForce = Math.cos(windRad) * windStrength;
  const yForce = Math.sin(windRad) * windStrength;
  const xA = xForce / mass;
  const effGrav = v.gravity - yForce / mass;
  return { xA, effGrav, xForce, yForce, B14: windStrength, windMass: mass };
}

function buildExcelResult(angle, velocity, time, wp, units) {
  if (velocity <= 0 || time <= 0 || wp.effGrav <= 0) return null;
  const radians = (angle + 0.00001) * Math.PI / 180;
  const cosA = Math.cos(radians), sinA = Math.sin(radians);
  const xVelocity = velocity * cosA, yVelocity = velocity * sinA;
  const trajectory = [];
  const steps = 200;
  for (let i = 0; i <= steps; i++) {
    const tt = (i / steps) * time;
    trajectory.push({
      x: (xVelocity * tt + 0.5 * wp.xA * tt * tt) * units.xScale,
      y: (yVelocity * tt - 0.5 * wp.effGrav * tt * tt) * units.yScale,
    });
  }
  return { angle, velocity: +velocity.toFixed(4), time: +time.toFixed(4), power: +velocity.toFixed(4), trajectory };
}

// 闭式解: 约定 y(0)=0 → y(T)=elev (目标在 elev 高度)
function calcExcelCenterTrajectory(vehicleId, angle, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
  const units = getExcelUnits(vehicleId, distance, elevationInternal, sdParts);
  const wp = calcExcelWindParams(vehicleId, windAngleDeg, windStrength);
  if (wp.effGrav <= 0) return null;
  const radians = (angle + 0.00001) * Math.PI / 180;
  const cosA = Math.cos(radians), sinA = Math.sin(radians), tanA = sinA / cosA;
  if (tanA <= 0) return null;
  const excelDist = units.dist - units.elev / tanA;
  const denom = (2 * cosA * sinA) / wp.effGrav + (2 * wp.xA * sinA * sinA) / (wp.effGrav * wp.effGrav);
  const velocitySquared = excelDist / denom;
  if (!Number.isFinite(velocitySquared) || velocitySquared <= 0) return null;
  const velocity = Math.sqrt(velocitySquared);
  const time = 2 * velocity * sinA / wp.effGrav;
  const displayVelocity = (units.dist - 0.5 * wp.xA * time * time) / (cosA * time);
  const result = buildExcelResult(angle, velocity, time, wp, units);
  return result ? { ...result, power: +displayVelocity.toFixed(4) } : null;
}

// ★ 数值积分: 起始 y=elev, 落地判据 y<0  (与闭式解 y(0)=0→y(T)=elev 符号相反)
function simBoomerTrajectory(power, angleDeg, wp, elevExcel, dt, tmax) {
  if (dt === undefined) dt = 0.002;
  if (tmax === undefined) tmax = 16;
  const Vo = power;
  const rad = angleDeg * Math.PI / 180;
  const xA = wp.xA, effGrav = wp.effGrav;
  let s = [0, elevExcel, Vo * Math.cos(rad), Vo * Math.sin(rad)];
  const deriv = (st) => [st[2], st[3], xA, -effGrav];
  let t = 0, wentBack = false, prevVx = s[2], maxX = 0;
  const sampleEvery = Math.max(1, Math.round((tmax / dt) / 200));
  const traj = [{ x: s[0], y: s[1] }];
  let stepCnt = 0;
  for (let i = 0; i < 100000; i++) {
    const k1 = deriv(s);
    const s2 = s.map((v, j) => v + k1[j] * dt / 2);
    const k2 = deriv(s2);
    const s3 = s.map((v, j) => v + k2[j] * dt / 2);
    const k3 = deriv(s3);
    const s4 = s.map((v, j) => v + k3[j] * dt);
    const k4 = deriv(s4);
    s = s.map((v, j) => v + (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]) * dt / 6);
    t += dt;
    if (s[2] < 0 && prevVx >= 0) wentBack = true;
    prevVx = s[2];
    if (s[0] > maxX) maxX = s[0];
    stepCnt++;
    if (stepCnt % sampleEvery === 0) traj.push({ x: s[0], y: s[1] });
    if (s[1] < 0 && t > dt) break;
    if (t > tmax) break;
  }
  traj.push({ x: s[0], y: s[1] });
  return { landingX: s[0], landingT: t, wentBack, maxX, trajectory: traj };
}

function calcBoomerTestAngle(power, wp, targetDist, elevExcel, sel) {
  const step = 0.3;
  const roots = [];
  let prevA = 5, prevR = simBoomerTrajectory(power, prevA, wp, elevExcel);
  let prevDelta = prevR.landingX - targetDist;
  for (let a = 5 + step; a <= 89.9; a += step) {
    const r = simBoomerTrajectory(power, a, wp, elevExcel);
    const delta = r.landingX - targetDist;
    if (prevDelta !== 0 && prevDelta * delta < 0 && Math.abs(r.landingX - prevR.landingX) < Math.abs(targetDist) * 2 + 4) {
      let lo = prevA, hi = a, dLo = prevDelta;
      for (let it = 0; it < 50; it++) {
        const mid = (lo + hi) / 2;
        const dm = simBoomerTrajectory(power, mid, wp, elevExcel).landingX - targetDist;
        if (dLo * dm <= 0) hi = mid; else { lo = mid; dLo = dm; }
      }
      const rootA = (lo + hi) / 2;
      const rf = simBoomerTrajectory(power, rootA, wp, elevExcel);
      if (Math.abs(rf.landingX - targetDist) < 0.05) roots.push({ angle: rootA, result: rf });
    }
    prevA = a; prevR = r; prevDelta = delta;
  }
  if (roots.length === 0) return null;
  const pool = (sel === 'hook') ? roots.filter(r => r.result.wentBack) : roots;
  if (pool.length === 0) return null;
  return pool.reduce((best, r) => r.angle > best.angle ? r : best, pool[0]);
}

const line = (s) => console.log(s);
const f = (x, n = 2) => Number(x).toFixed(n);

// ============ 实验 1: 闭式解 vs 数值解 的落差符号一致性 ============
line('='.repeat(78));
line('实验1: 同一 (angle, power) 下, 闭式解与数值解的落差方向是否一致');
line('  sd=33, power=3.0, 无风(ws=0), 改变落差');
line('  闭式约定: 球从 y=0 出发, 落地时到达 y=elev  → elev>0 = 目标更高');
line('  数值约定: 球从 y=elev 出发, 落地时到达 y=0 → elev>0 = 目标更低(方向相反!)');
line('='.repeat(78));
const sdTest = 33;
{
  const wp0 = calcExcelWindParams('boomer', 0, 0);
  for (const elevUI of [-10, -5, 0, 5, 10]) {
    const elevInternal = elevUI * ELEVATION_PIXELS_PER_UNIT;
    const u = getExcelUnits('boomer', sdTest, elevInternal, 20);
    const sim = simBoomerTrajectory(3.0, 45, wp0, u.elev);
    // 闭式: 该 angle/power 在平地(无落差)的落点
    const flatT = 2 * 3.0 * Math.sin(45 * Math.PI / 180) / wp0.effGrav;
    const flatX = 3.0 * Math.cos(45 * Math.PI / 180) * flatT;
    // 闭式: 到达 y=elev 的时刻(下降支)
    const vy = 3.0 * Math.sin(45 * Math.PI / 180);
    const disc = vy * vy - 2 * wp0.effGrav * u.elev;
    let closedX = null, closedT = null;
    if (disc >= 0) {
      closedT = (vy + Math.sqrt(disc)) / wp0.effGrav;
      closedX = 3.0 * Math.cos(45 * Math.PI / 180) * closedT;
    }
    line(`  落差UI=${String(elevUI).padStart(3)} (elev=${f(u.elev, 3)}): 平地落点=${f(flatX, 3)} | 闭式(elev高度)落点=${closedX === null ? '  n/a' : f(closedX, 3)} | 数值积分落点=${f(sim.landingX, 3)}  [数值-闭式=${closedX === null ? 'n/a' : f(sim.landingX - closedX, 3)}]`);
  }
}
line('  判读: 若 elev>0 时闭式落点 < 平地落点 而 数值落点 > 平地落点, 则两者对落差的处理方向相反.');

// ============ 实验 2: 逆风 / 顺风 弹道形态 ============
line('');
line('='.repeat(78));
line('实验2: 逆风 vs 顺风 弹道形态 (sd=33, power=3.0, 平地)');
line('  wa=180° = 纯逆风, wa=0° = 纯顺风, 数值积分轨迹采样');
line('='.repeat(78));
const sd = 33;
const targetDist = sd * 0.4;
for (const ws of [0, 5, 10, 15, 20]) {
  line(`\n--- 风力 ws=${ws} ---`);
  for (const [label, wa] of [['逆风180°', 180], ['顺风0°', 0]]) {
    const wp = calcExcelWindParams('boomer', wa, ws);
    const sol = calcBoomerTestAngle(3.0, wp, targetDist, 0, null);
    const solHook = calcBoomerTestAngle(3.0, wp, targetDist, 0, 'hook');
    if (wp.effGrav <= 0) { line(`  ${label}: effGrav<=0 无解`); continue; }
    line(`  ${label}: xA=${f(wp.xA, 5)} effGrav=${f(wp.effGrav, 5)} mass=${f(wp.windMass, 2)}`);
    if (!sol) line(`     全解池: 无解(该力度打不到 ${f(targetDist, 2)})`);
    else {
      const s = sol.result;
      line(`     高射解: angle=${f(sol.angle, 2)}° landX=${f(s.landingX, 3)} T=${f(s.landingT, 3)}s wentBack=${s.wentBack} maxX=${f(s.maxX, 3)}`);
      // 形态: 采样归一化轨迹
      const tr = s.trajectory;
      const xs = tr.map(p => p.x), ys = tr.map(p => p.y);
      const xmin = Math.min(...xs), xmax = Math.max(...xs), ymax = Math.max(...ys);
      line(`     形态: x∈[${f(xmin, 2)}, ${f(xmax, 2)}] 最高y=${f(ymax, 3)} 点数=${tr.length}  末点=(${f(tr[tr.length-1].x,2)}, ${f(tr[tr.length-1].y,2)})`);
      // 水平速度是否真的反号(折射判据)
      const vx0 = 3.0 * Math.cos(sol.angle * Math.PI / 180);
      const tRev = -vx0 / wp.xA;
      line(`     水平速度: vx0=${f(vx0, 4)} 反号时刻 t*=${wp.xA < 0 ? f(tRev, 3) : 'n/a(顺风不反号)'} 飞行T=${f(s.landingT, 3)}  → ${wp.xA < 0 ? (tRev < s.landingT ? '★飞行中反号(折射形态)' : '未反号(纯抛物)') : '无折射'}`);
    }
    if (solHook) line(`     ★回旋解(wentBack): angle=${f(solHook.angle, 2)}° landX=${f(solHook.result.landingX, 3)} T=${f(solHook.result.landingT, 3)}s maxX=${f(solHook.result.maxX, 3)}`);
    else line(`     回旋解: 无 (该 (力,风,距) 下无 wentBack 解)`);
  }
}

// ============ 实验 3: 折射(回旋)解存在的风区边界 ============
line('');
line('='.repeat(78));
line('实验3: 折射/回旋解的出现条件 (sd=33, power=3.0)');
line('  扫描风向 0..180 与 风力, 统计是否存在 wentBack 解');
line('='.repeat(78));
line('  风向(度) |  ws=5        ws=10       ws=15       ws=20');
for (let wa = 0; wa <= 180; wa += 15) {
  const cells = [];
  for (const ws of [5, 10, 15, 20]) {
    const wp = calcExcelWindParams('boomer', wa, ws);
    if (wp.effGrav <= 0) { cells.push('effG<=0   '); continue; }
    const h = calcBoomerTestAngle(3.0, wp, targetDist, 0, 'hook');
    const all = calcBoomerTestAngle(3.0, wp, targetDist, 0, null);
    cells.push(h ? (all ? '回旋+全解 ' : '仅回旋    ') : (all ? '仅直飞    ' : '无解      '));
  }
  line(`  ${String(wa).padStart(6)}   | ${cells.join(' ')}`);
}
