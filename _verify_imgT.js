// 图片场景 89.3/3.98, 反推真实T, 对比模型T_base+dT
// 还要看: 0.6°偏差到底是T偏高还是别的
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const dist=20,wa=338,ws=26,elev=0;
const realA=89.3,realP=3.98;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS,wy_acc=sinW*force/MASS,effGrav=G-wy_acc;
const V=realP/PF,aR=realA*Math.PI/180;
const vy=V*Math.sin(aR);
const elevPx=elev*EP;
const disc=vy*vy-2*effGrav*elevPx;
const T_true=(vy+Math.sqrt(disc))/effGrav;
const T_base=4.1243-0.01039*dist;
const dT=0.0243-0.00066*wy_acc;
const T_model=T_base+dT;
console.log('=== 图片场景 T 分析 ===');
console.log(`T_true(实测反推) = ${T_true.toFixed(4)}`);
console.log(`T_base          = ${T_base.toFixed(4)}`);
console.log(`dT(wy_acc=${wy_acc.toFixed(2)}) = ${dT.toFixed(4)}`);
console.log(`T_model         = ${T_model.toFixed(4)}`);
console.log(`T_model - T_true= ${(T_model-T_true).toFixed(4)}  (模型偏高这么多导致+0.6°)`);
console.log('');
// 用T_true解, 看角度
const xDist=dist*40;
const denom_true=xDist-0.5*xA*T_true*T_true;
const tanA_true=(elevPx+0.5*effGrav*T_true*T_true)/denom_true;
const ang_true=Math.atan(tanA_true)*180/Math.PI;
console.log(`用T_true=${T_true.toFixed(3)}解: angle=${ang_true.toFixed(2)} (实测89.3, 差${Math.abs(ang_true-89.3).toFixed(2)})`);
console.log(`用T_model=${T_model.toFixed(3)}解: angle=89.90 (差0.60)`);
console.log('');
// 所以T_model比T_true高0.093s. 这0.093s从哪来?
// T_base=3.9165偏高? 还是dT=0.051偏高?
// 无风N3 sd=20的真实T_base应该是多少? 看无风样本
console.log('=== 校准检查: T_base 和 dT 哪个偏高 ===');
const data=JSON.parse(require('fs').readFileSync('_real_v1.json','utf8'));
const effWa=(side,w)=>side==='左'?((180-w)%360+360)%360:w;
// 找近无风或低风的N3样本, 看T_base
const n3=data.filter(d=>d.n===3&&d.distance>=0);
console.log('N3样本 T_true vs sd (看T_base截距/斜率):');
for(const d of n3.slice(0,8)){
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const xa=Math.cos(r)*f/MASS,wya=Math.sin(r)*f/MASS,eg=G-wya;
  const Vv=d.power/PF,ar=d.angle*Math.PI/180,vyy=Vv*Math.sin(ar);
  const dc=vyy*vyy-2*eg*(d.elevation||0)*EP;
  if(dc<0)continue;const Tt=(vyy+Math.sqrt(dc))/eg;
  console.log(`  sd=${String(d.distance).padStart(5)} wa=${wa} ws=${d.windStrength} T_true=${Tt.toFixed(3)}`);
}
