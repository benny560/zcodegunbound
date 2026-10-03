// 正向验证: 给定表的(角度或90°+力度), 数值积分看落点是否=8
// 这才是真正的"精度核对"——表给的参数能不能打到20sd
const fs = require('fs');
const G = 0.608, DT = 0.0015, TMAX = 14;
function simulate(power, angleDeg, wa, ws, elevExcel = 0) {
  const Vo = power, rad = angleDeg*Math.PI/180;
  const mass = 85 - ws*ws*0.005, war = wa*Math.PI/180, force = ws;
  const xA = Math.cos(war)*force/mass, effGrav = G - Math.sin(war)*force/mass;
  let vx = Vo*Math.cos(rad), vy = Vo*Math.sin(rad), x=0, y=elevExcel, t=0;
  let wentBack=false, prevVx=vx, maxX=0;
  for (let i=0;i<100000;i++){
    vx += xA*DT; vy -= effGrav*DT; x += vx*DT; y += vy*DT; t += DT;
    if (vx<0 && prevVx>=0) wentBack=true; prevVx=vx;
    if (x>maxX) maxX=x;
    if (y<0 && t>DT) break; if (t>TMAX) break;
  }
  return { landingX:x, landingT:t, wentBack, maxX };
}

const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const TARGET = 8.0;
const matrixMeta = {
  '81_上': { baseAng:81, basePow:3.967 },
  '81_下': { baseAng:81, basePow:3.967 },
  '70_上': { baseAng:70, basePow:2.751 },
  '70_下': { baseAng:70, basePow:2.751 },
  '50_上': { baseAng:50, basePow:2.222 },
  '50_下': { baseAng:50, basePow:2.222 },
};

console.log('正向落点验证: 表参数(角度/力度) → 数值落点(目标8.0)');
console.log('角度模式: 用表角度+基础力度; 减力模式: 用90°+表力度\n');

const targetSD = TARGET / 0.4; // 20sd
let allErr = [];
for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  const m = table.matrices[mkey];
  let angleErrs = [], powerErrs = [];
  for (const e of m.entries) {
    if (e.mode === 'angle') {
      // 用表角度 + 基础力度, 看落点
      const r = simulate(meta.basePow, e.angle, e.wa, e.ws);
      const landingSD = r.landingX / 0.4;
      angleErrs.push({ ws:e.ws, wa:e.wa, ang:e.angle, landSD:+landingSD.toFixed(3), err: landingSD - 20, back: r.wentBack });
      allErr.push(Math.abs(landingSD - 20));
    } else if (e.mode === 'power') {
      // 用 90° + 表力度, 看落点
      const p = meta.basePow + e.dpower;
      const r = simulate(p, 90, e.wa, e.ws);
      const landingSD = r.landingX / 0.4;
      powerErrs.push({ ws:e.ws, wa:e.wa, pow:+p.toFixed(3), landSD:+landingSD.toFixed(3), err: landingSD - 20 });
      allErr.push(Math.abs(landingSD - 20));
    }
  }
  // 统计
  const comb = [...angleErrs.map(x=>x.err), ...powerErrs.map(x=>x.err)];
  const mae = comb.reduce((a,b)=>a+Math.abs(b),0)/comb.length;
  const maxE = Math.max(...comb.map(Math.abs));
  const within02 = comb.filter(x=>Math.abs(x)<0.2).length;  // 落点误差<0.2sd(8px)
  const within05 = comb.filter(x=>Math.abs(x)<0.5).length;
  console.log(`[${mkey}] ${angleErrs.length}角度+${powerErrs.length}减力 = ${comb.length}点`);
  console.log(`  落点MAE=${mae.toFixed(3)}sd 最大=${maxE.toFixed(3)}sd | <0.2sd命中率${(100*within02/comb.length).toFixed(1)}% | <0.5sd命中率${(100*within05/comb.length).toFixed(1)}%`);
  // 大偏差样例
  const big = [...angleErrs, ...powerErrs].filter(x=>Math.abs(x.err)>0.5).slice(0,4);
  if (big.length) console.log(`  大偏差: ${big.map(x=>`ws${x.ws}wa${x.wa}(落${x.landSD}sd,err${x.err>=0?'+':''}${x.err.toFixed(2)})`).join(' ')}`);
}
const maeAll = allErr.reduce((a,b)=>a+b,0)/allErr.length;
const hit02 = allErr.filter(x=>x<0.2).length;
const hit05 = allErr.filter(x=>x<0.5).length;
console.log(`\n=== 总计 ${allErr.length} 点 ===`);
console.log(`落点MAE=${maeAll.toFixed(4)}sd (= ${maeAll*8}px)`);
console.log(`落点误差<0.2sd(8px) 命中率: ${(100*hit02/allErr.length).toFixed(2)}%`);
console.log(`落点误差<0.5sd(20px) 命中率: ${(100*hit05/allErr.length).toFixed(2)}%`);
