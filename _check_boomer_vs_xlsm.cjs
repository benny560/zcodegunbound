// 把 gunbound_calculator.html 的 Boomer 计算代码原样复制进 node, 对照 boomer revolution.xlsm 快照
// 物理: g=0.608, mass=85-0.005w², dist=sd×0.4, xA=cos(wa)·w/m, effGrav=g-sin(wa)·w/m

const DISTANCE_PIXELS_PER_20SD = 800 / 20;
const ELEVATION_PIXELS_PER_UNIT = 516 / 13;
const MAX_DISPLAY_POWER = 5;
const BOOMER_MAX_POWER = MAX_DISPLAY_POWER;

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
  return { angle, velocity: +velocity.toFixed(4), time: +time.toFixed(4), power: +velocity.toFixed(4) };
}
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
function calcExcelFromTime(vehicleId, time, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
  const units = getExcelUnits(vehicleId, distance, elevationInternal, sdParts);
  const wp = calcExcelWindParams(vehicleId, windAngleDeg, windStrength);
  if (wp.effGrav <= 0 || time <= 0) return null;
  const denom = units.dist - 0.5 * wp.xA * time * time;
  if (denom <= 0) return null;
  const tanA = (units.elev + 0.5 * wp.effGrav * time * time) / denom;
  const angle = Math.atan(tanA) * 180 / Math.PI;
  if (angle <= 0 || angle >= 90) return null;
  const cosA = Math.cos((angle + 0.00001) * Math.PI / 180);
  const velocity = denom / (cosA * time);
  const result = buildExcelResult(angle, velocity, time, wp, units);
  return result ? { ...result, angleRaw: +angle.toFixed(2) } : null;
}
function calcExcelFromPower(vehicleId, power, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
  if (power <= 0) return [];
  const f = (angle) => {
    const r = calcExcelCenterTrajectory(vehicleId, angle, distance, windAngleDeg, windStrength, sdParts, elevationInternal);
    return r ? r.power - power : null;
  };
  const roots = [];
  let prevAngle = 1, prevValue = f(prevAngle);
  for (let angle = 1.25; angle < 89; angle += 0.25) {
    const value = f(angle);
    if (prevValue !== null && value !== null) {
      if (Math.abs(value) < 0.0001) roots.push(angle);
      else if (prevValue * value < 0) {
        let lo = prevAngle, hi = angle;
        for (let i = 0; i < 40; i++) {
          const mid = (lo + hi) / 2, midValue = f(mid), loValue = f(lo);
          if (midValue === null || loValue === null) break;
          if (loValue * midValue <= 0) hi = mid; else lo = mid;
        }
        roots.push((lo + hi) / 2);
      }
    }
    prevAngle = angle; prevValue = value;
  }
  const results = [];
  roots.forEach(angleDeg => {
    if (angleDeg <= 45) return;
    const roundedAngle = Math.round(angleDeg);
    const roundedResult = calcExcelCenterTrajectory(vehicleId, roundedAngle, distance, windAngleDeg, windStrength, sdParts, elevationInternal);
    if (!roundedResult) return;
    results.push({ ...roundedResult, angle: roundedAngle, angleRaw: +angleDeg.toFixed(2), power: +roundedResult.power.toFixed(4), type: '高射' });
  });
  results.sort((a, b) => b.angle - a.angle);
  return results;
}

// ===== boomer-test 数值求解器 =====
function simBoomerTrajectory(power, angleDeg, wp, elevExcel, dt, tmax) {
  if (dt === undefined) dt = 0.002;
  if (tmax === undefined) tmax = 16;
  const Vo = power, rad = angleDeg * Math.PI / 180;
  const xA = wp.xA, effGrav = wp.effGrav;
  let s = [0, elevExcel, Vo * Math.cos(rad), Vo * Math.sin(rad)];
  const deriv = (st) => [st[2], st[3], xA, -effGrav];
  let t = 0, wentBack = false, prevVx = s[2], maxX = 0;
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
    if (s[1] < 0 && t > dt) break;
    if (t > tmax) break;
  }
  return { landingX: s[0], landingT: t, wentBack, maxX };
}
function calcBoomerTestPower(angleDeg, wp, targetDist, elevExcel) {
  let lo = 0.1, hi = 6;
  let loR = simBoomerTrajectory(lo, angleDeg, wp, elevExcel);
  let hiR = simBoomerTrajectory(hi, angleDeg, wp, elevExcel);
  if (loR.landingX >= targetDist) return null;
  if (hiR.landingX < targetDist) return null;
  for (let it = 0; it < 50; it++) {
    const mid = (lo + hi) / 2;
    const r = simBoomerTrajectory(mid, angleDeg, wp, elevExcel);
    if (r.landingX < targetDist) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function calcBoomerTestAngle(power, wp, targetDist, elevExcel, sel) {
  const step = 0.3, roots = [];
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
function calcBoomerTestMode(modeType, fixedVal, distance, windAngleDeg, windStrength, sdParts, elevationInternal) {
  const units = getExcelUnits('boomer', Math.abs(distance), elevationInternal, sdParts);
  const wp = calcExcelWindParams('boomer', windAngleDeg, windStrength);
  if (wp.effGrav <= 0) return null;
  const isBackshot = (modeType === 'bs');
  const targetDist = isBackshot ? -Math.abs(units.dist) : units.dist;
  const elev = units.elev;
  let result = null;
  if (modeType === 'time') {
    const T = fixedVal;
    const denom = targetDist - 0.5 * wp.xA * T * T;
    if (denom <= 0.001) return null;
    const tanA = (elev + 0.5 * wp.effGrav * T * T) / denom;
    const angle = Math.atan(tanA) * 180 / Math.PI;
    if (angle <= 0 || angle >= 90) return null;
    const cosA = Math.cos((angle + 0.00001) * Math.PI / 180);
    const power = denom / (cosA * T);
    if (power <= 0 || power > MAX_DISPLAY_POWER) return null;
    const sim = simBoomerTrajectory(power, angle, wp, elev);
    result = { angle, power, time: T, wentBack: sim.wentBack, landingX: sim.landingX, landingErr: Math.abs(sim.landingX - targetDist), source: 'BOMB固定时间' };
  } else if (modeType === 'angle') {
    const angle = fixedVal;
    const power = calcBoomerTestPower(angle, wp, targetDist, elev);
    if (power === null || power > MAX_DISPLAY_POWER) return null;
    const sim = simBoomerTrajectory(power, angle, wp, elev);
    result = { angle, power, time: sim.landingT, wentBack: sim.wentBack, landingX: sim.landingX, landingErr: Math.abs(sim.landingX - targetDist), source: 'Hook固定角度' };
  } else if (modeType === 'power' || modeType === 'bs' || modeType === 'hook') {
    const power = fixedVal;
    const sol = calcBoomerTestAngle(power, wp, targetDist, elev, modeType === 'hook' ? 'hook' : 'high');
    if (sol === null) return null;
    result = { angle: sol.angle, power, time: sol.result.landingT, wentBack: sol.result.wentBack, landingX: sol.result.landingX, landingErr: Math.abs(sol.result.landingX - targetDist), source: modeType };
  }
  return result;
}
// 风区门控(与 render 层一致)
function gated(modeType, sector, windAngleDeg, windStrength, distance, sdParts, elev) {
  const windX = Math.cos(windAngleDeg * Math.PI / 180) * windStrength;
  if (sector === 'against' && !(windX < -0.01)) return '【仅逆风生效】';
  const r = calcBoomerTestMode(modeType, sector === 'against' && modeType === 'hook' ? 3.0 : 3.0, distance, windAngleDeg, windStrength, sdParts, elev);
  return r;
}

// ===== 对比 =====
const SD = 8; // sdParts 默认8(项目惯例), 对结果无影响(getExcelUnits忽略)
const fmt = (x, n = 4) => x === null || x === undefined ? 'null' : (+x).toFixed(n);

console.log('========== 1) xlsm 快照核对: dist=8内部(20sd), wa=110°, ws=7 (逆风+上风) ==========');
console.log('xlsm BOMER(N): 角度→力度 闭式 (calcExcelCenterTrajectory)');
const ref = { 30: 2.2483, 40: 2.1237, 50: 2.1449, 60: 2.3232, 70: 2.7808, 75: 3.2544, 80: 4.2160, 85: 7.9028 };
for (const a of Object.keys(ref)) {
  const r = calcExcelCenterTrajectory('boomer', +a, 20, 110, 7, SD, 0);
  console.log(`  ${a}°  表=${ref[a]}  计算器=${r ? fmt(r.power) : 'null'}  ${r && Math.abs(r.power - ref[a]) < 0.001 ? 'OK' : 'DIFF'}`);
}
const bomb = calcExcelFromTime('boomer', 3.00098, 20, 110, 7, SD, 0);
console.log(`  BOMB 表=16.376°/2.8227  计算器=${bomb ? fmt(bomb.angle, 2) + '°/' + fmt(bomb.power) : 'null'}`);

console.log('\n========== 2) boomer-test 同场景 (dist=20sd, wa=110, ws=7 逆风+上风) ==========');
const TEST_MODES = [
  { n: 'BOMB', t: 'time', v: 3.00098, s: 'any' },
  { n: 'Hook50', t: 'angle', v: 50, s: 'any' }, { n: 'Hook60', t: 'angle', v: 60, s: 'any' }, { n: 'Hook70', t: 'angle', v: 70, s: 'any' },
  { n: 'HookFull', t: 'power', v: 3.0, s: 'any' },
  { n: '折射回旋', t: 'hook', v: 3.0, s: 'against' }, { n: 'BS', t: 'bs', v: 3.0, s: 'against' },
];
function show(m, dist, wa, ws) {
  const windX = Math.cos(wa * Math.PI / 180) * ws;
  if (m.s === 'against' && !(windX < -0.01)) { console.log(`  ${m.n.padEnd(8)} 【仅逆风生效,已门控】`); return; }
  const r = calcBoomerTestMode(m.t, m.v, dist, wa, ws, SD, 0);
  console.log(`  ${m.n.padEnd(8)} ${r ? `角度=${fmt(r.angle, 2)} 力度=${fmt(r.power)} t=${fmt(r.time, 2)} wentBack=${r.wentBack} landingX=${fmt(r.landingX, 2)} err=${fmt(r.landingErr, 3)}` : 'null(无解)'}`);
}
for (const m of TEST_MODES) show(m, 20, 110, 7);

console.log('\n========== 3) 顺风场景: dist=20sd, wa=0°(纯顺风), ws=10 —— 回旋系应被门控 ==========');
for (const m of TEST_MODES) show(m, 20, 0, 10);

console.log('\n========== 4) 纯逆风 wa=180°, 折射回旋(hook) vs HookFull 选解核对 ==========');
console.log('xlsm BS表(前目标回旋族): ws=19 → ~49.7/53.7/57.7/61.7 (远→近4档, @3.0)');
for (const ws of [10, 15, 19, 24]) {
  console.log(`-- ws=${ws} --`);
  for (const sd of [10, 15, 17.5, 20]) {
    const hook = calcBoomerTestMode('hook', 3.0, sd, 180, ws, SD, 0);
    const hf = calcBoomerTestMode('power', 3.0, sd, 180, ws, SD, 0);
    console.log(`  dist=${String(sd).padStart(4)}sd  折射回旋=${hook ? fmt(hook.angle, 1) + '° wentBack=' + hook.wentBack : 'null'}  HookFull=${hf ? fmt(hf.angle, 1) + '° wentBack=' + hf.wentBack : 'null'}`);
  }
}
console.log('  (对照: ws=19 xlsm≈61.7@10sd / 57.7@12.5sd / 53.7@17.5sd / 49.7@20sd)');

console.log('\n========== 5) BS 背射: dist=20sd, 各风向, ws=15 ==========');
for (const wa of [0, 45, 90, 135, 180, 225, 270, 315]) {
  const windX = Math.cos(wa * Math.PI / 180) * 15;
  const gated = !(windX < -0.01);
  const r = calcBoomerTestMode('bs', 3.0, 20, wa, 15, SD, 0);
  console.log(`  wa=${String(wa).padStart(3)} windX=${fmt(windX, 2)} ${gated ? '[顺风/侧风→门控]' : ''} ${r ? `角度=${fmt(r.angle, 1)}° wentBack=${r.wentBack} landingX=${fmt(r.landingX, 2)}` : gated ? '—' : 'null(无解)'}`);
}
