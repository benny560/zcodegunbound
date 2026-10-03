// 【只推算】用xErrSD最新公式算截图场景 N2/N3. 先从实测标定N2/N3偏移, 再算场景.
// 场景: dist=19.8 落差-5.5 风向118 风力16 右攻. 用法: node _calc_screenshot.cjs
const fs = require('fs');
const PF=0.004332712, MASS=0.23, G=430, EPPU=516/13;
const Tfit={ 'right:2':{a:2.8655,b:-0.01427},'right:3':{a:4.1243,b:-0.01039},'right:4':{a:5.1541,b:-0.00462} };

function solve(spinN, sd, elevUI, waEff, ws, xErrSD){  // xErrSD: 质心偏移(SD), 0=不修正
  const fit=Tfit[`right:${spinN}`];
  const wr=waEff*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
  const force = ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS;
  const T=fit.a+fit.b*sd + (0.0243-0.00066*(sinW*force/MASS));
  const xDist=sd*40, elev=elevUI*EPPU;
  const denom=(xDist + xErrSD*40) - 0.5*xA*T*T;
  const angle=Math.atan((elev+0.5*effGrav*T*T)/denom)*180/Math.PI;
  const V=denom/(Math.cos(angle*Math.PI/180)*T);
  return { angle, power:V*PF, xA, effGrav, T };
}
function landOf(angle, power, xA, effGrav, elevPx){
  const V=power/PF, aR=angle*Math.PI/180, vy=V*Math.sin(aR), vx=V*Math.cos(aR);
  const disc=vy*vy-2*effGrav*elevPx; if(disc<0) return null;
  const T=(vy+Math.sqrt(disc))/effGrav;
  return vx*T+0.5*xA*T*T;
}
const data = JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
function calib(spinN){  // 从实测扫描最佳常数偏移
  const sub=data.filter(d=>d.side==='右'&&d.n===spinN&&d.distance>0);
  let best={k:0,m:9}, cur=0;
  for(let k=0;k<=1.4;k+=0.05){
    let sm=0,c=0;
    for(const d of sub){
      const elevPx=(d.elevation||0)*EPPU;
      const s=solve(spinN,d.distance,d.elevation||0,d.windAngle,d.windStrength,k);
      const lr=landOf(d.angle,d.power,s.xA,s.effGrav,elevPx), ls=landOf(s.angle,s.power,s.xA,s.effGrav,elevPx);
      if(lr!=null&&ls!=null){ sm+=Math.abs((ls-lr)/40); c++; }
    }
    const m=sm/c; if(Math.abs(k)<1e-9)cur=m; if(m<best.m)best={k,m};
  }
  return {n:sub.length, curMiss:cur, ...best};
}

console.log('=== 从实测标定右侧常数质心偏移(以落点为准) ===');
const c2=calib(2), c3=calib(3);
console.log(`  N2 (${c2.n}条): 最佳偏移=${c2.k.toFixed(2)}SD | |落点偏差| 修前${c2.curMiss.toFixed(2)} -> 修后${c2.m.toFixed(2)}SD`);
console.log(`  N3 (${c3.n}条): 最佳偏移=${c3.k.toFixed(2)}SD | |落点偏差| 修前${c3.curMiss.toFixed(2)} -> 修后${c3.m.toFixed(2)}SD`);

// ==== 截图场景 ====
const S={dist:19.8, elev:-5.5, wa:118, ws:16};
console.log(`\n=== 截图场景: 距离${S.dist} 落差${S.elev} 风向${S.wa} 风力${S.ws} 右攻 ===`);
console.log('N | 修前(无修正) A/P | 修后(xErrSD) A/P | 用偏移 | 说明');
for(const [n,k] of [[2,c2.k],[3,c3.k]]){
  const cur=solve(n,S.dist,S.elev,S.wa,S.ws,0);
  const fix=solve(n,S.dist,S.elev,S.wa,S.ws,k);
  console.log(`N${n}| ${cur.angle.toFixed(1)}° / ${cur.power.toFixed(3)}   | ${fix.angle.toFixed(1)}° / ${fix.power.toFixed(3)}   | ${k.toFixed(2)}SD | 角度${(fix.angle-cur.angle>=0?'+':'')}${(fix.angle-cur.angle).toFixed(1)}° 力度${(fix.power-cur.power>=0?'+':'')}${(fix.power-cur.power).toFixed(3)}`);
}
console.log('\n⚠ 注意: 此场景落差-5.5很大, 标定样本里没有"大负落差+上风"的N2/N3, 属外推, 仅供参考.');
