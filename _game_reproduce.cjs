// 用 OpenBound 游戏模型(无0.5, g≈196, 风不除mass) 复现67条实测, 对比我们的0.5模型. node _game_reproduce.cjs
const fs = require('fs'), RAD = Math.PI / 180, PF = 0.004332712, EPPU = 516 / 13;
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8')).filter(d => d.distance > 0); // 正向
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;

// 每条: 已知 V0=cP*power, angle, xDist=sd*40, elev=elevUI*EPPU, 风. 游戏模型(无0.5):
//   x(t)= V0 cos a · t + ax·t² ;  y(t)= V0 sin a · t - gy·t²
//   ax = cos(wE)·kW·force ;  gy = g - sgn·sin(wE)·kW·force ;  force=max(0,ws-1)
// 解 T from x(取最小正根), 算 yLand, 残差=|yLand-elev|/40 (SD).
function residualsGame(cP, kW, g, sgn) {
  let sum = 0, n = 0, hit = 0;
  for (const d of data) {
    const V0 = cP * d.power, a = d.angle * RAD, wE = eff(d) * RAD;
    const force = Math.max(0, d.windStrength - 1);
    const xDist = d.distance * 40, elev = (d.elevation || 0) * EPPU;
    const ax = Math.cos(wE) * kW * force;
    const gy = g - sgn * Math.sin(wE) * kW * force;
    const vx = V0 * Math.cos(a), vy = V0 * Math.sin(a);
    // ax*T² + vx*T - xDist = 0
    let T;
    if (Math.abs(ax) < 1e-9) T = xDist / vx;
    else { const disc = vx * vx + 4 * ax * xDist; if (disc < 0) continue; const q = Math.sqrt(disc); const t1 = (-vx + q) / (2 * ax), t2 = (-vx - q) / (2 * ax); const pos = [t1, t2].filter(t => t > 0.05 && t < 20); if (!pos.length) continue; T = Math.min(...pos); }
    if (!(T > 0)) continue;
    const yLand = vy * T - gy * T * T;
    sum += Math.abs(yLand - elev) / 40; n++;
    if (Math.abs(yLand - elev) / 40 < 0.5) hit++;
  }
  return { mae: sum / (n || 1), n, hit };
}

// 网格搜索最优 (cP, kW, g, sgn)
let best = { mae: Infinity };
for (let cP = 180; cP <= 250; cP += 2)
  for (let kW = 0; kW <= 60; kW += 1)
    for (let g = 150; g <= 280; g += 2)
      for (const sgn of [1, -1]) {
        const r = residualsGame(cP, kW, g, sgn);
        if (r.mae < best.mae) best = { mae: r.mae, cP, kW, g, sgn, hit: r.hit, n: r.n };
      }
console.log('======= OpenBound 游戏模型(无0.5) 复现 67 条正向实测 =======\n');
console.log(`最优拟合: cP(power→速度)=${best.cP}  kW(风系数)=${best.kW}  g(重力)=${best.g}  风垂直符号=${best.sgn}`);
console.log(`  → 落点自洽 yErr MAE = ${best.mae.toFixed(2)} SD   (自洽<0.5SD的条数: ${best.hit}/${best.n})`);
console.log(`  参考: 游戏源码 g=196; 我们的0.5模型等效 g≈392(=2×196), 标定值G=430`);
console.log(`  参考: 我们0.5模型的 yErr MAE = 2.83 SD (来自 _T_residual)`);

// 固定 g=196 看看
let b196 = { mae: Infinity };
for (let cP = 150; cP <= 320; cP += 1)
  for (let kW = 0; kW <= 80; kW += 1)
    for (const sgn of [1, -1]) {
      const r = residualsGame(cP, kW, 196, sgn);
      if (r.mae < b196.mae) b196 = { mae: r.mae, cP, kW, sgn, hit: r.hit, n: r.n };
    }
console.log(`\n固定 g=196(游戏值): cP=${b196.cP} kW=${b196.kW} sgn=${b196.sgn} → yErr MAE=${b196.mae.toFixed(2)} SD (自洽<0.5: ${b196.hit}/${b196.n})`);
