// N4左攻: T_true vs sd, 看远距离(sd>20)段T_base是否系统性偏低
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const subs=[];
for(const d of data){
  if(d.n!==4||d.distance<0||d.side!=='左')continue;
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const wya=Math.sin(r)*f/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0)continue;
  const Tt=(vy+Math.sqrt(dc))/eg;
  subs.push({sd:d.distance,ws:d.windStrength,wa,Tt,elev:d.elevation});
}
subs.sort((a,b)=>a.sd-b.sd);
console.log('N4左攻 T_true vs sd (按距离排序):');
console.log('sd     ws wa  elev | T_true  T_base(4.819-0.018sd)  diff');
for(const s of subs){
  const Tb=4.819-0.018*s.sd;
  console.log(`${String(s.sd).padStart(6)} ${String(s.ws).padStart(2)} ${String(s.wa).padStart(3)} ${String(s.elev||0).padStart(4)} | ${s.Tt.toFixed(3)}  ${Tb.toFixed(3)}  ${(s.Tt-Tb>=0?'+':'')+(s.Tt-Tb).toFixed(3)}`);
}
// 只看sd>=20的
const far=subs.filter(s=>s.sd>=20);
const near=subs.filter(s=>s.sd<20);
console.log(`\nsd<20 (n=${near.length}): T_true-T_base 均值=${(near.reduce((a,s)=>a+(s.Tt-(4.819-0.018*s.sd)),0)/near.length).toFixed(4)}`);
console.log(`sd>=20 (n=${far.length}): T_true-T_base 均值=${(far.reduce((a,s)=>a+(s.Tt-(4.819-0.018*s.sd)),0)/far.length).toFixed(4)}`);
