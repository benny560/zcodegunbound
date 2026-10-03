// 诊断: 找出大偏差点, 看是否在物理边界(回旋/角度到90/低风)
const fs = require('fs');
// 复用 solver 的函数, 直接 require 不方便(会执行), 这里内联精简版
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

const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const TARGET = 8.0;
const matrixMeta = {
  '50_上': { baseAng:50, basePow:2.222 },
  '50_下': { baseAng:50, basePow:2.222 },
  '81_上': { baseAng:81, basePow:3.967 },
};

for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  const m = table.matrices[mkey];
  console.log(`\n===== ${mkey} 大偏差点(角度模式, |err|>1°) =====`);
  const bad = [];
  for (const e of m.entries) {
    if (e.mode !== 'angle') continue;
    const roots = findAngleRoots(meta.basePow, e.wa, e.ws, TARGET);
    if (roots.length === 0) { bad.push({...e, roots:0, calcAng:null, err:null}); continue; }
    // 选最接近baseAng的非回旋解
    let best=null,bestD=Infinity;
    for (const r of roots){ if(r.wentBack)continue; const d=Math.abs(r.angle-meta.baseAng); if(d<bestD){bestD=d;best=r.angle;} }
    if (best===null) best = roots[0].angle;
    const err = best - e.angle;
    if (Math.abs(err) > 1) bad.push({...e, roots:roots.length, calcAng:best.toFixed(2), err:err.toFixed(2), rootDetails: roots.map(r=>`${r.angle.toFixed(1)}${r.wentBack?'↺':''}`)});
  }
  console.log(`  大偏差 ${bad.length} 条:`);
  // 按ws分组显示
  for (const b of bad.slice(0,25)) {
    console.log(`    ws=${b.ws} wa=${b.wa}: 表${b.angle} 算${b.calcAng} 差${b.err} [根:${b.rootDetails?b.rootDetails.join(','):b.roots+'个解]无'}`);
  }
}
