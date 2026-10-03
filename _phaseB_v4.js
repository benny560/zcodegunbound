// 方向B v4: 加入第3约束 xErrSD = f(angle)
const fs=require('fs');
// tanA的denom不用xDist, 用 xLand = xDist + 40·xErrSD(angle)
// xErrSD(angle) 来自实测拟合
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const omegaR = V => 0.023623 * Math.pow(V, 0.764315);
const omegaL = V => 0.687878 * Math.pow(V, 0.299291);
// rotPi
const rotPi={
  right:{3:[5.4193,-0.01912,0.0002769],4:[6.906,-0.001204,0]},
  left: {3:[5.4637,-0.01490,0.0000595],4:[6.906,-0.001204,0]}
};
// xErrSD(angle) 拟合: N3/N4 left/right
const xErrModel={
  // [c0, c1] => xErrSD = c0 + c1·angle
  'right:3':[2.018,-0.0147],
  'left:3':[2.665,-0.0357],
  'right:4':[5.259,-0.0508],
  'left:4':[-1.408,0.0092]
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
  const xErrC=xErrModel[`${side}:${spinN}`];
  if(!xErrC)return null;
  let T=4.0;
  for(let i=0;i<200;i++){
    // 先估angle算xErrSD, 再用xLand做denom
    // 迭代内层: angle依赖denom, denom依赖xErrSD, xErrSD依赖angle. 嵌套迭代.
    let denom=xDist; // 初值
    let ang=0;
    for(let j=0;j<10;j++){
      const tanA=(elev+0.5*eg*T*T)/denom;
      if(tanA<=0)break;
      ang=Math.atan(tanA)*180/Math.PI;
      if(ang<1)break;
      const xErrSD=xErrC[0]+xErrC[1]*ang;
      const xLand=xDist+40*xErrSD;
      denom=xLand-0.5*xA*T*T;
      if(denom<=0.001)break;
    }
    if(denom<=0.001||ang<1)return null;
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
  // 最终
  let denom=xDist,ang=0;
  for(let j=0;j<20;j++){
    const tanA=(elev+0.5*eg*T*T)/denom;
    ang=Math.atan(tanA)*180/Math.PI;
    const xErrSD=xErrC[0]+xErrC[1]*ang;
    denom=xDist+40*xErrSD-0.5*xA*T*T;
  }
  if(denom<=0.001)return null;
  const cosA=Math.cos(ang*Math.PI/180);
  const V=denom/(cosA*T);
  return {angle:ang, power:V*PF, T};
}
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;

// 测试4标准点
console.log('=== v4: 4标准点 right:4 wa=90 ===');
let mA=0,mP=0;
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},{sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97}]){
  const r=solve(20,'right',4,t.sd,0,90,t.ws);
  if(!r){console.log(`sd=${t.sd} NULL`);continue;}
  mA+=Math.abs(r.angle-t.a);mP+=Math.abs(r.power-t.p);
  console.log(`sd=${t.sd}: ${r.angle.toFixed(2)}/${r.power.toFixed(3)} (实测${t.a}/${t.p}) dA${(r.angle-t.a).toFixed(2)} dP${(r.power-t.p).toFixed(3)}`);
}
console.log(`MAE: dA=${(mA/4).toFixed(2)} dP=${(mP/4).toFixed(3)}`);

// 全量N3/N4
console.log('\n=== 全量回归 ===');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
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
