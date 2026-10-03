// 定位剩余离群点
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
function findAngleRoots(power, wa, ws, target, elevExcel=0, aLo=10, aHi=89.9, step=0.3) {
  const roots=[]; let prevA=aLo, prevR=simulate(power,aLo,wa,ws,elevExcel);
  let prevDelta=prevR.landingX-target;
  for (let a=aLo+step; a<=aHi; a+=step){
    const r=simulate(power,a,wa,ws,elevExcel); const delta=r.landingX-target;
    if (prevDelta!==0 && prevDelta*delta<0 && Math.abs(r.landingX-prevR.landingX)<5){
      let lo=prevA, hi=a, dLo=prevDelta;
      for (let it=0;it<50;it++){ const mid=(lo+hi)/2; const dm=simulate(power,mid,wa,ws,elevExcel).landingX-target;
        if (dLo*dm<=0) hi=mid; else { lo=mid; dLo=dm; } }
      const rootAng=(lo+hi)/2; const rf=simulate(power,rootAng,wa,ws,elevExcel);
      if (Math.abs(rf.landingX-target)<0.05) roots.push({angle:rootAng, wentBack:rf.wentBack, maxX:rf.maxX});
    }
    prevA=a; prevR=r; prevDelta=delta;
  }
  return roots;
}
function solveAngleFor(power, wa, ws, target, elevExcel=0) {
  const roots = findAngleRoots(power, wa, ws, target, elevExcel);
  if (roots.length === 0) return null;
  const normal = roots.filter(r => !r.wentBack);
  const pool = normal.length ? normal : roots;
  let best = pool[0];
  for (const r of pool) if (r.angle > best.angle) best = r;
  return best.angle;
}
function solvePowerFor(angle, wa, ws, target, elevExcel = 0) {
  let lo = 0.1, hi = 6;
  for (let it = 0; it < 60; it++) {
    const mid = (lo + hi) / 2;
    const r = simulate(mid, angle, wa, ws, elevExcel);
    if (r.landingX < target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
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

console.log('=== 角度模式 |err|>0.5° 的离群点 ===');
for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  const m = table.matrices[mkey];
  const outliers = [];
  for (const e of m.entries) {
    if (e.mode !== 'angle') continue;
    const calcAng = solveAngleFor(meta.basePow, e.wa, e.ws, TARGET);
    if (calcAng === null) { outliers.push({...e, calcAng:null, err:999, reason:'无解'}); continue; }
    const err = calcAng - e.angle;
    if (Math.abs(err) > 0.5) outliers.push({...e, calcAng:+calcAng.toFixed(2), err:+err.toFixed(2)});
  }
  if (outliers.length) {
    console.log(`\n[${mkey}] ${outliers.length} 离群点:`);
    outliers.slice(0,15).forEach(o=>console.log(`  ws=${o.ws} wa=${o.wa}: 表${o.angle} 算${o.calcAng} 差${o.err} ${o.reason||''}`));
  }
}

console.log('\n=== 减力模式 |err|>0.05 的离群点 ===');
for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  const m = table.matrices[mkey];
  const outliers = [];
  for (const e of m.entries) {
    if (e.mode !== 'power') continue;
    const expPow = meta.basePow + e.dpower;
    const calcPow = solvePowerFor(90, e.wa, e.ws, TARGET);
    const err = calcPow - expPow;
    if (Math.abs(err) > 0.05) outliers.push({ws:e.ws, wa:e.wa, exp:+expPow.toFixed(3), calc:+calcPow.toFixed(3), err:+err.toFixed(3)});
  }
  if (outliers.length) {
    console.log(`\n[${mkey}] ${outliers.length} 离群点:`);
    outliers.slice(0,12).forEach(o=>console.log(`  ws=${o.ws} wa=${o.wa}: 表力度${o.exp} 算${o.calc} 差${o.err}`));
  }
}
