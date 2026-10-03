// 验证: dT应该正比于 +wy_acc 还是 -wy_acc?
// 物理推导说 T=2vy/g_eff, g_eff=g-wy_acc.
// 无风g_eff=g, 有风T'=2vy/(g-wy_acc).
// dT = T'-T = 2vy*(1/(g-wy_acc) - 1/g) = 2vy*wy_acc/(g*(g-wy_acc))
// wy_acc>0(上风): dT>0, T增大 ✓ (上风托球, 飞更久)
// wy_acc<0(下风): dT<0, T减小 ✓ (下风压球, 飞更短)
// 所以 dT 正比于 +wy_acc. 当前公式 -0.00066*wy_acc 符号反了!
//
// 用全量数据验证: 看实测 dT_true vs wy_acc 的相关性符号
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const fits={'1':{a:1.7998,b:-0.04357},'2':{a:2.8655,b:-0.01427},'3':{r:{a:4.1243,b:-0.01039},l:{a:3.478,b:-0.01085}},'4':{r:{a:5.1551,b:-0.00594},l:{a:4.819,b:-0.018}}};

for(const n of [1,2,3,4]){
  const sub=[];
  for(const d of data){
    if(d.n!==n||d.distance<0)continue;
    const dir=d.side==='右'?'r':'l';
    const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
    const f=Math.max(0,(d.windStrength||0)-1);
    const wya=Math.sin(r)*f/MASS,eg=G-wya;
    const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
    const dc=vy*vy-2*eg*(d.elevation||0)*EP;
    if(dc<0)continue;const Tt=(vy+Math.sqrt(dc))/eg;
    let Tb;
    if(n===1)Tb=fits[1].a+fits[1].b*d.distance;
    else if(n===2)Tb=fits[2].a+fits[2].b*d.distance;
    else Tb=fits[n][dir].a+fits[n][dir].b*d.distance;
    sub.push({wya,dT:Tt-Tb});
  }
  if(sub.length<5)continue;
  // 相关系数 dT vs wy_acc
  const mx=sub.reduce((s,x)=>s+x.wya,0)/sub.length;
  const my=sub.reduce((s,x)=>s+x.dT,0)/sub.length;
  let num=0,dx=0,dy=0;
  for(const s of sub){num+=(s.wya-mx)*(s.dT-my);dx+=(s.wya-mx)**2;dy+=(s.dT-my)**2;}
  const corr=num/Math.sqrt(dx*dy);
  console.log(`N${n}(n=${sub.length}): corr(dT_true, wy_acc) = ${corr.toFixed(3)} ${corr>0?'(正相关, dT∝+wy_acc, 物理对)':'(负相关, dT∝-wy_acc)'}`);
}
