// 严格推导: cap 到底需不需要 0.92 余量?
// 约束链:
//   1) denom > 0  =>  T < T_max = sqrt(2*xDist/xA)
//   2) V = denom/(cosA*T) 要有限且>0
//   3) power = V*PF 要 <= MAX_DISPLAY_POWER(5)
// 看看在 T_max 附近, angle/power 怎么变化, 是不是真的"V爆炸"
const G=430,MASS=0.23,PF=0.004332712,sdParts=20,dist=20,elev=0,wa=338,ws=26;
const sd=dist;
const wr=wa*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS;
const xDist=sd*(800/sdParts);
const T_max=Math.sqrt(2*xDist/xA);

console.log('T_max(数学硬上限,denom=0) = '+T_max.toFixed(4));
console.log('');
console.log('T        denom    tanA      angle    V       power   备注');
for(const f of [0.92,0.95,0.97,0.99,0.995,0.999,1.0]){
  const T=T_max*f;
  const denom=xDist-0.5*xA*T*T;
  const tanA=(elev+0.5*effGrav*T*T)/denom;
  const ang=Math.atan(tanA)*180/Math.PI;
  const V=denom/(Math.cos(ang*Math.PI/180)*T);
  const power=V*PF;
  let note='';
  if(f===0.92) note='当前cap';
  if(f===1.0) note='denom=0, V=inf';
  console.log(`${(f).toFixed(3)}   ${denom.toFixed(1).padStart(6)}  ${tanA.toFixed(1).padStart(7)}  ${ang.toFixed(2).padStart(6)}  ${V.toFixed(1).padStart(6)}  ${power.toFixed(3).padStart(6)}  ${note}`);
}
console.log('');
console.log('实测: 89.3deg / 3.98  -> 反推 T_true=3.875 (f='+ (3.875/T_max).toFixed(3)+')');
console.log('');
console.log('结论: 从 f=0.92 到 0.999, power 从 3.74 平滑涨到 4.04, 没有突变/爆炸.');
console.log('      只有 f=1.0(denom=0) 才真正发散. 0.92 纯粹是过度保守, 不是数学必需.');
