// 检查4个标准点的实测落点 vs 目标, 以及全量N4样本的落点偏差
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
function landing(side,wa0,ws,dist,elev,angle,power){
  const wa=effWa(side,wa0);const r=wa*Math.PI/180;
  const force=Math.max(0,ws-1);
  const xA=Math.cos(r)*force/MASS,eg=G-Math.sin(r)*force/MASS;
  const V=power/PF,ar=angle*Math.PI/180;
  const vx=V*Math.cos(ar),vy=V*Math.sin(ar);
  const elevPx=(elev||0)*EP;
  const disc=vy*vy-2*eg*elevPx;
  if(disc<0)return null;
  const T=(vy+Math.sqrt(disc))/eg;
  const xLand=vx*T+0.5*xA*T*T;
  return {T,xLand,xDist:dist*40,xErrPx:xLand-dist*40,xErrSD:(xLand-dist*40)/40};
}
console.log('=== 4个right:4标准点 实测落点 ===');
console.log('sd ws | 实测A/P    | T      xLand  xDist  xErr(SD)');
const tests=[
  {sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97},
];
for(const t of tests){
  const r=landing('右',90,t.ws,t.sd,0,t.a,t.p);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p} | ${r.T.toFixed(3)} ${r.xLand.toFixed(0)}  ${r.xDist.toFixed(0)}  ${r.xErrSD>=0?'+':''}${r.xErrSD.toFixed(2)}`);
}
console.log('');
console.log('=== 全量N4样本 实测落点偏差 ===');
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
console.log('side sd   wa ws | A/P        | xErr(SD)');
let sum=0,n=0;
for(const d of data){
  if(d.n!==4||d.distance<0)continue;
  const r=landing(d.side,d.windAngle,d.windStrength,d.distance,d.elevation,d.angle,d.power);
  if(!r)continue;
  sum+=r.xErrSD;n++;
  console.log(`${d.side} ${String(d.distance).padStart(5)} ${String(d.windAngle).padStart(3)} ${String(d.windStrength).padStart(2)} | ${d.angle}/${d.power.toFixed(2)} | ${r.xErrSD>=0?'+':''}${r.xErrSD.toFixed(2)}`);
}
console.log(`\nN4平均落点偏差: ${(sum/n).toFixed(3)} SD (n=${n})`);
