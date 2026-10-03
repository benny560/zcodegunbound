// 用T_true=4.423(实测反推) 重算图片场景, 看正确的angle/power
const G=430,MASS=0.23,PF=0.004332712;
const sd=33,wa=90,ws=12;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS;
const effGrav=G-sinW*force/MASS;
const xDist=sd*40;
// 用T_true=4.423 (从实测样本sd=33反推)
const T_true=4.423;
const halfEffG_T2=0.5*effGrav*T_true*T_true;
const denom=xDist-0.5*xA*T_true*T_true;
const tanA=(0+halfEffG_T2)/denom;
const angle=Math.atan(tanA)*180/Math.PI;
const V=denom/(Math.cos(angle*Math.PI/180)*T_true);
const power=V*PF;
console.log('=== 图片场景(左4 sd=33 wa=90 ws=12) 用真实T重算 ===');
console.log(`T_true = ${T_true} (从实测样本反推)`);
console.log(`effGrav = ${effGrav.toFixed(2)}`);
console.log(`halfEffG·T² = ${halfEffG_T2.toFixed(2)}`);
console.log(`denom = ${denom.toFixed(2)}`);
console.log(`tanA = ${tanA.toFixed(4)}`);
console.log(`angle = ${angle.toFixed(2)}°`);
console.log(`V = ${V.toFixed(1)}`);
console.log(`power = ${power.toFixed(4)}`);
console.log('');
console.log('=== 对比 ===');
console.log(`  当前计算器(T=4.218): 68.78° / 3.7460`);
console.log(`  用T_true(T=4.423):   ${angle.toFixed(2)}° / ${power.toFixed(4)}`);
console.log(`  实测附近(sd=33 wa=68 ws=11): 69° / 4.0`);
console.log('');
// 也测几个不同T值, 看power对T的敏感度
console.log('=== power 对 T 的敏感度 ===');
console.log('T      | angle   power');
for(const T of [4.218, 4.30, 4.40, 4.423, 4.50]){
  const h=0.5*effGrav*T*T, d=xDist-0.5*xA*T*T;
  const ta=h/d, a=Math.atan(ta)*180/Math.PI;
  const v=d/(Math.cos(a*Math.PI/180)*T), p=v*PF;
  console.log(`${T.toFixed(3)} | ${a.toFixed(2)}°  ${p.toFixed(4)}`);
}
