// N4 left: 分析xErrSD在不同风况下怎么变, 需要加什么风项
const fs=require('fs');
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const rows=[];
for(const d of data){
  if(d.n!==4||d.side!=='左'||d.distance<0)continue;
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const force=Math.max(0,(d.windStrength||0)-1);
  const xA=Math.cos(r)*force/MASS, wya=Math.sin(r)*force/MASS, eg=G-wya;
  const V=d.power/PF, ar=d.angle*Math.PI/180;
  const vx=V*Math.cos(ar), vy=V*Math.sin(ar);
  const disc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(disc<0)continue;
  const T=(vy+Math.sqrt(disc))/eg;
  const xLand=vx*T+0.5*xA*T*T;
  const xDist=d.distance*40;
  rows.push({sd:d.distance,angle:d.angle,T,xErrSD:(xLand-xDist)/40,wa,ws:d.windStrength||0,xA,wya,eg,force});
}
// 标准点(wa=90 ws=20)的xErrSD vs 其他风况的xErrSD
console.log('=== N4 left: xErrSD vs 风况 ===');
console.log('sd   wa_eff ws | xErrSD  | xA     wya    | 风的落点贡献(0.5*xA*T²)');
for(const r of rows.sort((a,b)=>a.wa-b.wa)){
  const windContrib=0.5*r.xA*r.T*r.T;
  console.log(`${String(r.sd).padStart(5)} ${String(r.wa).padStart(3)} ${String(r.ws).padStart(2)} | ${(r.xErrSD>=0?'+':'')+r.xErrSD.toFixed(3)}  | ${r.xA.toFixed(1).padStart(6)} ${r.wya.toFixed(1).padStart(6)} | ${windContrib.toFixed(0)}`);
}
console.log('');
console.log('wa=90时xA=0(纯上风), xErrSD纯粹来自角度+旋转几何.');
console.log('wa≠90时xA≠0(斜风), 风的水平分量直接改变xLand.');
console.log('=> xErrSD模型要加xA项: xErrSD = c0 + c1·angle + c2·xA');
