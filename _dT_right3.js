// 精准校准右N3的dT. 用右攻样本, dT_true = T_true - T_base_right3(sd)
// 然后看 dT_true vs wy_acc 的关系
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const Tb = sd => 4.1243-0.01039*sd;
const sub=[];
for(const d of data){
  if(d.n!==3||d.distance<0||d.side!=='右')continue;
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const xa=Math.cos(r)*f/MASS,wya=Math.sin(r)*f/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0)continue;const Tt=(vy+Math.sqrt(dc))/eg;
  sub.push({sd:d.distance,ws:d.windStrength,wa,wy_acc:wya,xa,dT:Tt-Tb(d.distance)});
}
console.log('=== 右N3样本 dT_true vs wy_acc ===');
console.log('sd    ws wa  wy_acc  xa     | dT_true  当前dT(0.0243-0.00067wy)');
for(const s of sub.sort((a,b)=>a.wy_acc-b.wy_acc)){
  const dm=0.0243-0.00066*s.wy_acc;
  console.log(`${String(s.sd).padStart(5)} ${String(s.ws).padStart(2)} ${String(s.wa).padStart(3)} ${s.wy_acc.toFixed(1).padStart(6)} ${s.xa.toFixed(1).padStart(6)} | ${(s.dT>=0?'+':'')+s.dT.toFixed(3).padStart(6)}   ${dm.toFixed(3)}`);
}
// 拟合 dT = c0 + c1*wy_acc
let sx=0,sy=0,sxx=0,sxy=0,n=sub.length;
for(const s of sub){sx+=s.wy_acc;sy+=s.dT;sxx+=s.wy_acc*s.wy_acc;sxy+=s.wy_acc*s.dT;}
const c1=(n*sxy-sx*sy)/(n*sxx-sx*sx),c0=(sy-c1*sx)/n;
let maeC=0,maeF=0;
for(const s of sub){maeC+=Math.abs(s.dT-(0.0243-0.00066*s.wy_acc));maeF+=Math.abs(s.dT-(c0+c1*s.wy_acc));}
console.log(`\n当前dT: 0.0243 - 0.00066*wy_acc, MAE=${(maeC/n).toFixed(4)}`);
console.log(`拟合dT: ${c0.toFixed(4)} + (${c1.toFixed(6)})*wy_acc, MAE=${(maeF/n).toFixed(4)}`);
console.log(`\n图片场景(wa=338,wy_acc=-40.7): 当前dT=${(0.0243-0.00066*-40.7).toFixed(4)}, 拟合dT=${(c0+c1*-40.7).toFixed(4)}`);
