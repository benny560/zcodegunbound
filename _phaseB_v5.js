// 方向B v5: xErrSD用更丰富模型, 直接对比最终dA
const fs=require('fs');
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const omegaR = V => 0.023623 * Math.pow(V, 0.764315);
const omegaL = V => 0.687878 * Math.pow(V, 0.299291);
const rotPi={
  right:{3:[5.4193,-0.01912,0.0002769],4:[6.906,-0.001204,0]},
  left: {3:[5.4637,-0.01490,0.0000595],4:[6.906,-0.001204,0]}
};
// xErrSD模型 (从实测拟合): xErrSD = c0 + c1·angle + c2·T
// N3: [-2.48, -0.0344, 1.5201]  N4用各自
// 分side重拟合更准, 这里先用全量N3的
const xErrModel={
  'right:3':[-2.48,-0.0344,1.5201],
  'left:3':[-2.48,-0.0344,1.5201],
  'right:4':[5.259,-0.0508,0],   // N4right angle-only最好
  'left:4':[-1.408,0.0092,0]
};

function solve(sdParts, side, spinN, distance, elev, wa, ws){
  const poly=rotPi[side]?.[spinN]; if(!poly)return null;
  const sd=Math.abs(distance);
  const rp=poly[0]+poly[1]*sd+poly[2]*sd*sd;
  const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS, eg=G-sinW*force/MASS;
  if(eg<=0)return null;
  const xDist=sd*(800/sdParts);
  const omegaFn=side==='left'?omegaL:omegaR;
  const xc=xErrModel[`${side}:${spinN}`]; if(!xc)return null;
  const xErrAt=(ang,T)=>xc[0]+xc[1]*ang+xc[2]*T;
  let T=4.0;
  for(let i=0;i<200;i++){
    let denom=xDist, ang=0;
    for(let j=0;j<10;j++){
      const tanA=(elev+0.5*eg*T*T)/denom;
      if(tanA<=0){denom=-1;break;}
      ang=Math.atan(tanA)*180/Math.PI;
      if(ang<1){denom=-1;break;}
      const xErrSD=xErrAt(ang,T);
      denom=xDist+40*xErrSD-0.5*xA*T*T;
      if(denom<=0.001){denom=-1;break;}
    }
    if(denom<=0.001)return null;
    const cosA=Math.cos(ang*Math.PI/180);
    if(cosA<=0.001)return null;
    const V=denom/(cosA*T);
    if(V<=0||V>2000)return null;
    const power=V*PF;
    if(power<=0||power>5)return null;
    const Tn=rp*Math.PI/omegaFn(V);
    if(!Number.isFinite(Tn)||Tn<=0)return null;
    if(Math.abs(Tn-T)<1e-4)break;
    T=0.5*(T+Tn);
  }
  let denom=xDist,ang=0;
  for(let j=0;j<20;j++){
    const tanA=(elev+0.5*eg*T*T)/denom;
    ang=Math.atan(tanA)*180/Math.PI;
    const xErrSD=xErrAt(ang,T);
    denom=xDist+40*xErrSD-0.5*xA*T*T;
    if(denom<=0.001)return null;
  }
  const cosA=Math.cos(ang*Math.PI/180);
  const V=denom/(cosA*T);
  return {angle:ang, power:V*PF, T};
}
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));

console.log('=== v5 全量回归 ===');
for(const n of [3,4]){
  let ok=0,n_=0,sA=0,sP=0,nulls=[];
  for(const d of data){
    if(d.n!==n||d.distance<0)continue;
    n_++;
    const dir=d.side==='右'?'right':'left';
    const wa=effWa(d.side,d.windAngle);
    const r=solve(20,dir,n,d.distance,(d.elevation||0)*EP,wa,d.windStrength);
    if(r){ok++;sA+=Math.abs(r.angle-d.angle);sP+=Math.abs(r.power-d.power);}
    else nulls.push(`${d.side}${d.distance}`);
  }
  console.log(`N${n}: ${ok}/${n_} dA_MAE=${ok?(sA/ok).toFixed(2):'-'} dP_MAE=${ok?(sP/ok).toFixed(3):'-'} NULL:${nulls.length}`);
}
// 4标准点
console.log('\n4标准点:');
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:40,ws:21,a:68.4,p:3.97}]){
  const r=solve(20,'right',4,t.sd,0,90,t.ws);
  console.log(`  sd=${t.sd}: ${r?r.angle.toFixed(2)+'/'+r.power.toFixed(3):'NULL'} (实测${t.a}/${t.p})`);
}
