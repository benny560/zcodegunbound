// 【只推算/验证】right N3/N4: 角度+力度一起算落点, 标定各N专属质心偏移
// 用法: node _verify_xerrsd.cjs
const fs = require('fs');
const PF=0.004332712, MASS=0.23, G=430, EPPU=516/13, sdParts=20;
const Tfit={ 'right:2':{a:2.8655,b:-0.01427},'right:3':{a:4.1243,b:-0.01039},'right:4':{a:5.1541,b:-0.00462} };
const XERR_N4={ c0:5.2587, c1:-0.0508 };  // RULES 6.6 右侧(N4纯上风标定)

// 给定时间求解器复刻; xErrFn(angle)->SD 返回质心偏移(瞄 xDist+xErrSD*40). null=不修正
function solve(spinN, sd, elevUI, waEff, ws, xErrFn){
  const fit=Tfit[`right:${spinN}`]; if(!fit) return null;
  const wr=waEff*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
  const force = ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS;
  if(effGrav<=0) return null;
  const T=fit.a+fit.b*sd + (0.0243-0.00066*(sinW*force/MASS));
  const xDist=sd*40, elev=elevUI*EPPU;
  let angle=null, xe=0;
  for(let it=0; it<8; it++){
    const denom=(xDist + (xErrFn?xe*40:0)) - 0.5*xA*T*T;
    angle=Math.atan((elev+0.5*effGrav*T*T)/denom)*180/Math.PI;
    if(!xErrFn) break;
    xe=xErrFn(angle);
  }
  const denom=(xDist + (xErrFn?xe*40:0)) - 0.5*xA*T*T;
  const V=denom/(Math.cos(angle*Math.PI/180)*T);
  return { angle, power:V*PF, xA, effGrav };
}
function landOf(angle, power, xA, effGrav, elevPx){
  const V=power/PF, aR=angle*Math.PI/180, vy=V*Math.sin(aR), vx=V*Math.cos(aR);
  const disc=vy*vy-2*effGrav*elevPx; if(disc<0) return null;
  const T=(vy+Math.sqrt(disc))/effGrav;
  return vx*T+0.5*xA*T*T;
}

const data = JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
function samplesOf(n){ return data.filter(d=>d.side==='右' && d.n===n && d.distance>0); }

// 对一个xErrFn, 算该组样本的平均|落点miss|(相对实测落点)
function avgMiss(subset, spinN, xErrFn){
  let sm=0, cnt=0;
  for(const d of subset){
    const elevPx=(d.elevation||0)*EPPU, waEff=d.windAngle;
    const s=solve(spinN,d.distance,d.elevation||0,waEff,d.windStrength,xErrFn);
    const lr=landOf(d.angle,d.power,s.xA,s.effGrav,elevPx);
    const ls=landOf(s.angle,s.power,s.xA,s.effGrav,elevPx);
    if(lr==null||ls==null) continue;
    sm+=Math.abs((ls-lr)/40); cnt++;
  }
  return sm/cnt;
}

// ---- N4: 现状 vs RULES公式 ----
const n4=samplesOf(4);
console.log('===== N4 (%d条) 平均|落点miss| =====', n4.length);
console.log('  修前(无修正):        ', avgMiss(n4,4,null).toFixed(3),'SD');
console.log('  修后(RULES N4公式):  ', avgMiss(n4,4,a=>XERR_N4.c0+XERR_N4.c1*a).toFixed(3),'SD');

// ---- N3: 现状 vs N4公式 vs 常数扫描 vs 缩放公式 ----
const n3=samplesOf(3);
console.log('\n===== N3 (%d条) 平均|落点miss| =====', n3.length);
console.log('  修前(无修正):        ', avgMiss(n3,3,null).toFixed(3),'SD');
console.log('  N4公式(过大):        ', avgMiss(n3,3,a=>XERR_N4.c0+XERR_N4.c1*a).toFixed(3),'SD');
console.log('  --- N3 常数偏移扫描 ---');
let best={k:0,m:9}; 
for(let k=0.0;k<=1.4;k+=0.1){ const m=avgMiss(n3,3,()=>k); if(m<best.m)best={k,m}; console.log(`    xErrSD=${k.toFixed(1)}SD: |miss|=${m.toFixed(3)}`); }
console.log(`  => N3最佳常数偏移 ≈ ${best.k.toFixed(1)}SD, |miss|=${best.m.toFixed(3)}SD`);

// ---- N3 逐条: 修前 vs 最佳常数 ----
console.log('\n=== N3 逐条 (修前 vs xErrSD=%sSD) ===', best.k.toFixed(1));
console.log('dist  elev wa  ws | 实测A/P    | 修前A/P  miss | 修后A/P  miss');
for(const d of n3){
  const elevPx=(d.elevation||0)*EPPU, waEff=d.windAngle;
  const c=solve(3,d.distance,d.elevation||0,waEff,d.windStrength,null);
  const f=solve(3,d.distance,d.elevation||0,waEff,d.windStrength,()=>best.k);
  const lr=landOf(d.angle,d.power,c.xA,c.effGrav,elevPx);
  const mc=(landOf(c.angle,c.power,c.xA,c.effGrav,elevPx)-lr)/40;
  const mf=(landOf(f.angle,f.power,f.xA,f.effGrav,elevPx)-lr)/40;
  console.log(`${String(d.distance).padStart(5)} ${String(d.elevation).padStart(4)} ${String(d.windAngle).padStart(3)} ${String(d.windStrength).padStart(2)} | ${String(d.angle).padStart(4)}/${d.power.toFixed(2)} | ${c.angle.toFixed(1).padStart(4)}/${c.power.toFixed(2)} ${(mc>=0?'+':'')+mc.toFixed(2)} | ${f.angle.toFixed(1).padStart(4)}/${f.power.toFixed(2)} ${(mf>=0?'+':'')+mf.toFixed(2)}`);
}
