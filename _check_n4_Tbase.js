// 检查 N4 的 T_base 拟合: 用全部N4实测样本反推T_true, 对比T_base+dT
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const fits={'right:4':{a:5.1551,b:-0.00594},'left:4':{a:4.819,b:-0.018}};
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
console.log('=== N4 全部样本 T_model vs T_true ===');
console.log('side sd   wa ws | T_base dT    T_model T_true  diff');
const subs=[];
for(const d of data){
  if(d.n!==4||d.distance<0)continue;
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const wya=Math.sin(r)*f/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0){console.log(`  ${d.side}${d.distance} T反推失败`);continue;}
  const Tt=(vy+Math.sqrt(dc))/eg;
  const fit=fits[`${dir}:4`];
  const Tb=fit.a+fit.b*d.distance;
  const dT=0.0243-0.00066*wya;
  const Tm=Tb+dT;
  subs.push({dir,sd:d.distance,Tt,Tm,diff:Tm-Tt});
  console.log(`${dir.slice(0,1)} ${String(d.distance).padStart(5)} ${String(wa).padStart(3)} ${String(d.windStrength).padStart(2)} | ${Tb.toFixed(3)} ${dT.toFixed(3).padStart(6)} ${Tm.toFixed(3)} ${Tt.toFixed(3)} ${(Tm-Tt>=0?'+':'')+(Tm-Tt).toFixed(3)}`);
}
const mean=subs.reduce((s,x)=>s+x.diff,0)/subs.length;
const mae=subs.reduce((s,x)=>s+Math.abs(x.diff),0)/subs.length;
console.log(`\nN4 T偏误: mean=${mean.toFixed(4)} MAE=${mae.toFixed(4)} (n=${subs.length})`);
// 左右分开
for(const dir of ['right','left']){
  const s=subs.filter(x=>x.dir===dir);
  if(!s.length)continue;
  const m=s.reduce((a,x)=>a+x.diff,0)/s.length;
  console.log(`  ${dir}: n=${s.length} mean=${m.toFixed(4)}`);
}
