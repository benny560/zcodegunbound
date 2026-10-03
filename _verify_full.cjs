// 【只推算】全量实测对比: 左右两侧 N2/N3/N4, 各自标定质心偏移, 看xErrSD在哪组有效
// 基准=实测Excel(_excel_real.json). 落点=角度+力度一起算. 用法: node _verify_full.cjs
const fs = require('fs');
const PF=0.004332712, MASS=0.23, G=430, EPPU=516/13;
const Tfit={
  'right:2':{a:2.8655,b:-0.01427},'right:3':{a:4.1243,b:-0.01039},'right:4':{a:5.1541,b:-0.00462},
  'left:2':{a:2.4008,b:-0.02506}, 'left:3':{a:3.4780,b:-0.01085}, 'left:4':{a:4.5933,b:-0.00545},
};
function solve(side, spinN, sd, elevUI, waEff, ws, xErrSD){
  const fit=Tfit[`${side}:${spinN}`]; if(!fit) return null;
  const wr=waEff*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
  const force = ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS; if(effGrav<=0) return null;
  const T=fit.a+fit.b*sd + (0.0243-0.00066*(sinW*force/MASS));
  const xDist=sd*40, elev=elevUI*EPPU;
  const denom=(xDist + xErrSD*40) - 0.5*xA*T*T; if(denom<=1) return null;
  const angle=Math.atan((elev+0.5*effGrav*T*T)/denom)*180/Math.PI;
  const V=denom/(Math.cos(angle*Math.PI/180)*T);
  return { angle, power:V*PF, xA, effGrav };
}
function landOf(angle, power, xA, effGrav, elevPx){
  const V=power/PF, aR=angle*Math.PI/180, vy=V*Math.sin(aR), vx=V*Math.cos(aR);
  const disc=vy*vy-2*effGrav*elevPx; if(disc<0) return null;
  const T=(vy+Math.sqrt(disc))/effGrav; return vx*T+0.5*xA*T*T;
}
const data = JSON.parse(fs.readFileSync('_excel_real.json','utf8'));

// 左射翻转风向水平分量
function effWa(d){ return d.side==='左' ? ((180-d.windAngle)%360+360)%360 : d.windAngle; }
function sideKey(d){ return d.side==='右' ? 'right' : 'left'; }

function missOf(subset, side, spinN, k){
  let sm=0,c=0;
  for(const d of subset){
    const s=solve(side,spinN,Math.abs(d.distance),d.elevation||0,effWa(d),d.windStrength,k);
    if(!s) continue;
    const elevPx=(d.elevation||0)*EPPU;
    const lr=landOf(d.angle,d.power,s.xA,s.effGrav,elevPx), ls=landOf(s.angle,s.power,s.xA,s.effGrav,elevPx);
    if(lr==null||ls==null) continue;
    sm+=Math.abs((ls-lr)/40); c++;
  }
  return c? {miss:sm/c, n:c} : null;
}
// 带符号平均miss(看系统性偏向): 修前(k=0)
function signedMiss(subset, side, spinN){
  let sm=0,c=0;
  for(const d of subset){
    const s=solve(side,spinN,Math.abs(d.distance),d.elevation||0,effWa(d),d.windStrength,0);
    if(!s) continue;
    const elevPx=(d.elevation||0)*EPPU;
    const lr=landOf(d.angle,d.power,s.xA,s.effGrav,elevPx), ls=landOf(s.angle,s.power,s.xA,s.effGrav,elevPx);
    if(lr==null||ls==null) continue;
    sm+=(ls-lr)/40; c++;
  }
  return c? sm/c : null;
}

console.log('== 全量实测对比 (基准=Excel 67条; 落点=角度+力度一起算; 正射 N2-4) ==');
console.log('侧  N | n | 修前|miss| 修前带符号 | 最佳offset 修后|miss|');
for(const side of ['right','left']){
  for(const n of [2,3,4]){
    const sub=data.filter(d=> sideKey(d)===side && d.n===n && d.distance>0);
    if(!sub.length) continue;
    const cur=missOf(sub,side,n,0);
    const sgn=signedMiss(sub,side,n);
    let best={k:0,m:9};
    for(let k=-1.5;k<=1.6;k+=0.05){ const r=missOf(sub,side,n,k); if(r&&r.miss<best.m)best={k,m:r.miss}; }
    console.log(`${side==='right'?'右':'左'}  N${n} | ${String(cur?cur.n:0).padStart(2)} | ${(cur?cur.miss.toFixed(2):'--').padStart(6)}   ${(sgn>=0?'+':'')+sgn.toFixed(2)}     | ${(best.k>=0?'+':'')}${best.k.toFixed(2)}SD   ${best.m.toFixed(2)}`);
  }
}
console.log('\n注: 修前带符号 <0=系统性偏短, >0=偏长. N1/背射走不同代码路径, 未纳入此对比.');
