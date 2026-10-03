// Boomer 数值弹道求解器原型 + 全量核对
// 物理: g=0.608, mass=85-0.005*w², 距离=sd*0.4, 力度=Vo
// 风公式: xA=cos(wa)*ws/mass, effGrav=g-sin(wa)*ws/mass  (ws=force=windStrength)
// 弹道: x''=xA, y''=-effGrav (y向上为正)
//
// 开炮表v4 含义(已验证):
//   角度模式: 固定基础力度, 不同风下命中20sd所需角度 = 基础角 + 系数*ws
//   减力模式: 角度到90后, 固定90°, 力度调整 = 基础力度 + 系数*ws(系数为负=减力)
//
// 核对思路:
//   对每个矩阵条目(ws,wa):
//     角度模式: 数值找使落点=8(20sd)的角度, 对照表角度
//     减力模式: 数值找使落点=8的(90°固定)力度, 对照表 力度=基础+系数*ws
//   无风表: 数值找各sd各角度的力度, 对照表力度

const fs = require('fs');
const G = 0.608;
const DT = 0.0015;
const TMAX = 14;

// 数值积分弹道, 返回落点信息
function simulate(power, angleDeg, windAngleDeg, windStrength, elevExcel = 0) {
  const Vo = power;
  const rad = angleDeg * Math.PI / 180;
  const mass = 85 - windStrength * windStrength * 0.005;
  const war = windAngleDeg * Math.PI / 180;
  const force = windStrength;
  const xA = Math.cos(war) * force / mass;
  const effGrav = G - Math.sin(war) * force / mass;
  let vx = Vo * Math.cos(rad), vy = Vo * Math.sin(rad);
  let x = 0, y = elevExcel, t = 0;
  let wentBack = false, prevVx = vx, maxX = 0;
  for (let i = 0; i < 100000; i++) {
    vx += xA * DT; vy -= effGrav * DT;
    x += vx * DT; y += vy * DT; t += DT;
    if (vx < 0 && prevVx >= 0) wentBack = true;
    prevVx = vx;
    if (x > maxX) maxX = x;
    if (y < 0 && t > DT) break;
    if (t > TMAX) break;
  }
  return { landingX: x, landingT: t, wentBack, maxX };
}

// --- 求解器1: 固定角度, 二分搜索力度使落点=target ---
function solvePowerFor(angle, wa, ws, target, elevExcel = 0, pLo = 0.1, pHi = 6) {
  // 弹道: 力度越大落点越远(单调, 不回旋时)。回旋时可能不单调, 用扫描+二分
  // 先扫描找符号变化区间
  let lo = pLo, hi = pHi;
  // 单调性检查: 在合理力度范围内, Boomer 不回旋时落点随力度单调增
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2;
    const r = simulate(mid, angle, wa, ws, elevExcel);
    if (r.landingX < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// --- 求解器2: 固定力度, 找使落点=target的角度 ---
// Boomer 在逆风高角度时会回旋, 角度-落点关系不单调
// 策略: 从低到高扫描角度, 记录所有穿过 target 的点
function solveAnglesFor(power, wa, ws, target, elevExcel = 0, aLo = 5, aHi = 89.9, step = 0.2) {
  const hits = [];
  let prevX = null, prevA = null;
  for (let a = aLo; a <= aHi; a += step) {
    const r = simulate(power, a, wa, ws, elevExcel);
    if (prevX !== null) {
      // 检测是否穿过 target (单调段)
      if ((prevX - target) * (r.landingX - target) <= 0 && Math.abs(r.landingX - prevX) > 1e-6) {
        // 在 [prevA, a] 区间二分
        let lo = prevA, hi = a;
        for (let it = 0; it < 40; it++) {
          const mid = (lo + hi) / 2;
          const rm = simulate(power, mid, wa, ws, elevExcel);
          if ((simulate(lo, lo, wa, ws, elevExcel).landingX - target) * (rm.landingX - target) > 0) lo = mid; else hi = mid;
        }
        hits.push((lo + hi) / 2);
      }
    }
    prevX = r.landingX; prevA = a;
  }
  return hits;
}

// 干净版: 检测所有"落点穿过 target"的角度, 返回解列表
// Boomer 弹道在顺风/逆风下可能多解: 低角度平射解 + 高角度高抛解
// 开炮表记录的全是高抛解(角度在基础角附近), 调用方选最接近 baseAng 的解
function findAngleRoots(power, wa, ws, target, elevExcel = 0, aLo = 10, aHi = 89.9, step = 0.3) {
  const roots = [];
  let prevA = aLo, prevR = simulate(power, aLo, wa, ws, elevExcel);
  let prevDelta = prevR.landingX - target;
  for (let a = aLo + step; a <= aHi; a += step) {
    const r = simulate(power, a, wa, ws, elevExcel);
    const delta = r.landingX - target;
    // 检测符号变化(穿过target), 排除回旋点(landingX突变)
    if (prevDelta !== 0 && (prevDelta * delta < 0) && Math.abs(r.landingX - prevR.landingX) < 5) {
      // 在 [prevA, a] 二分
      let lo = prevA, hi = a, dLo = prevDelta;
      for (let it = 0; it < 50; it++) {
        const mid = (lo + hi) / 2;
        const dm = simulate(power, mid, wa, ws, elevExcel).landingX - target;
        if (dLo * dm <= 0) hi = mid; else { lo = mid; dLo = dm; }
      }
      const rootAng = (lo + hi) / 2;
      const rf = simulate(power, rootAng, wa, ws, elevExcel);
      if (Math.abs(rf.landingX - target) < 0.05) {
        roots.push({ angle: rootAng, wentBack: rf.wentBack });
      }
    }
    prevA = a; prevR = r; prevDelta = delta;
  }
  return roots;
}

// 开炮表角度求解: 返回高抛解(角度最大的非回旋解)
// Boomer 开炮表记录的全是高抛弹道(球飞得高再落下), 不是平射解
function solveAngleFor(power, wa, ws, target, elevExcel = 0, baseAng = 70) {
  const roots = findAngleRoots(power, wa, ws, target, elevExcel);
  if (roots.length === 0) return null;
  // 过滤回旋解(开炮表不记录回旋解), 在剩余解里取角度最大的(=高抛解)
  const normal = roots.filter(r => !r.wentBack);
  const pool = normal.length ? normal : roots;
  // 高抛解 = 角度最大的那个(低角度平射解角度小)
  let best = pool[0];
  for (const r of pool) if (r.angle > best.angle) best = r;
  return best.angle;
}

const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json', 'utf-8'));
const DIST_SCALE = 0.4;
const TARGET_20SD = 20 * DIST_SCALE; // 8.0

// ====== 核对1: 无风力 度表 ======
console.log('='.repeat(70));
console.log('核对1: 无风力 度表 (81/70/50° × sd 1-30, elev=0)');
console.log('方法: 固定角度, 数值找力度使落点=sd*0.4');
console.log('='.repeat(70));
const baseAngles = { p81: 81, p70: 70, p50: 50 };
const nwStats = { p81: [], p70: [], p50: [] };
for (const row of table.nowind) {
  for (const key of ['p81','p70','p50']) {
    const ang = baseAngles[key];
    const target = row.sd * DIST_SCALE;
    const calcP = solvePowerFor(ang, 0, 0, target);
    const expP = row[key];
    const err = calcP - expP;
    nwStats[key].push({ sd: row.sd, exp: expP, calc: calcP, err });
  }
}
for (const key of ['p81','p70','p50']) {
  const s = nwStats[key];
  const mae = s.reduce((a,b)=>a+Math.abs(b.err),0)/s.length;
  const maxErr = Math.max(...s.map(x=>Math.abs(x.err)));
  const within = s.filter(x=>Math.abs(x.err)<0.02).length;
  console.log(`  ${key}(基础${baseAngles[key]}°): MAE=${mae.toFixed(4)} 最大偏差=${maxErr.toFixed(4)} |<0.02|命中${within}/${s.length}`);
  // 显示前5和后2
  console.log(`    sd1: 表${s[0].exp} 算${s[0].calc.toFixed(3)} 差${s[0].err.toFixed(3)} | sd10: 表${s[9].exp} 算${s[9].calc.toFixed(3)} 差${s[9].err.toFixed(3)} | sd30: 表${s[29].exp} 算${s[29].calc.toFixed(3)} 差${s[29].err.toFixed(3)}`);
}

// ====== 核对2+3: 6个矩阵 (角度模式 + 减力模式) ======
console.log('\n' + '='.repeat(70));
console.log('核对2/3: 6个矩阵 (固定基础力度, 不同风下命中20sd)');
console.log('角度模式: 数值找角度, 对照表角度');
console.log('减力模式: 角度到90, 数值找力度(90°固定), 对照表力度');
console.log('='.repeat(70));
const matrixMeta = {
  '81_上': { baseAng: 81, basePow: 3.967, name: '81°顺风(0-90)' },
  '81_下': { baseAng: 81, basePow: 3.967, name: '81°逆风转(270-360)' },
  '70_上': { baseAng: 70, basePow: 2.751, name: '70°顺风(0-90)' },
  '70_下': { baseAng: 70, basePow: 2.751, name: '70°逆风转(270-360)' },
  '50_上': { baseAng: 50, basePow: 2.222, name: '50°顺风(0-90)' },
  '50_下': { baseAng: 50, basePow: 2.222, name: '50°逆风转(270-360)' },
};

let allAngleErr = [], allPowerErr = [];
for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  const m = table.matrices[mkey];
  const angleErrs = [], powerErrs = [];
  let angleSolved = 0, angleFailed = 0, powerSolved = 0, powerFailed = 0;

  for (const e of m.entries) {
    if (e.mode === 'angle') {
      // 固定 basePow, 找角度使落点=8
      const calcAng = solveAngleFor(meta.basePow, e.wa, e.ws, TARGET_20SD, 0, meta.baseAng);
      if (calcAng === null) { angleFailed++; continue; }
      const err = calcAng - e.angle;
      angleErrs.push({ ws: e.ws, wa: e.wa, exp: e.angle, calc: calcAng, err });
      allAngleErr.push(Math.abs(err));
      angleSolved++;
    } else if (e.mode === 'power') {
      // 角度到90, 固定90°, 找力度使落点=8
      // 表力度 = basePow + dpower(dpower<0, 即减力)
      const expPow = meta.basePow + e.dpower;
      const calcPow = solvePowerFor(90, e.wa, e.ws, TARGET_20SD);
      const err = calcPow - expPow;
      powerErrs.push({ ws: e.ws, wa: e.wa, exp: expPow, calc: calcPow, err });
      allPowerErr.push(Math.abs(err));
      powerSolved++;
    }
  }

  const angleMAE = angleErrs.length ? angleErrs.reduce((a,b)=>a+Math.abs(b.err),0)/angleErrs.length : 0;
  const angleMax = angleErrs.length ? Math.max(...angleErrs.map(x=>Math.abs(x.err))) : 0;
  const powerMAE = powerErrs.length ? powerErrs.reduce((a,b)=>a+Math.abs(b.err),0)/powerErrs.length : 0;
  const powerMax = powerErrs.length ? Math.max(...powerErrs.map(x=>Math.abs(x.err))) : 0;
  console.log(`\n[${mkey}] ${meta.name} 基础${meta.baseAng}°/${meta.basePow}`);
  console.log(`  角度模式: ${angleSolved}解/${angleFailed}失败, MAE=${angleMAE.toFixed(3)}° 最大=${angleMax.toFixed(3)}°`);
  console.log(`  减力模式: ${powerSolved}解/${powerFailed}失败, MAE=${powerMAE.toFixed(4)} 最大=${powerMax.toFixed(4)}`);
  // 显示几个样例
  if (angleErrs.length) {
    const samp = angleErrs.filter(x=>x.ws<=3).slice(0,3);
    console.log(`    样例: ${samp.map(x=>`ws${x.ws}wa${x.wa}:表${x.exp}算${x.calc.toFixed(2)}(${x.err>=0?'+':''}${x.err.toFixed(2)})`).join(' | ')}`);
  }
}

// ====== 总结 ======
console.log('\n' + '='.repeat(70));
console.log('总结');
console.log('='.repeat(70));
const angleMAE_all = allAngleErr.reduce((a,b)=>a+b,0)/allAngleErr.length;
const powerMAE_all = allPowerErr.length ? allPowerErr.reduce((a,b)=>a+b,0)/allPowerErr.length : 0;
const angleWithin = allAngleErr.filter(x=>x<0.5).length;
const powerWithin = allPowerErr.filter(x=>x<0.03).length;
console.log(`角度模式: ${allAngleErr.length}点, MAE=${angleMAE_all.toFixed(4)}°, |偏差|<0.5° 命中率=${(100*angleWithin/allAngleErr.length).toFixed(1)}%`);
console.log(`减力模式: ${allPowerErr.length}点, MAE=${powerMAE_all.toFixed(4)}, |偏差|<0.03 命中率=${(100*powerWithin/allPowerErr.length).toFixed(1)}%`);
