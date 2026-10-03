// right:4 4标准点: 角度全偏高0.5-0.7°, 力度全偏低0.02-0.04 => T仍偏低
// 重新校准: 找让角度和力度都最准的T_base系数
// 方法: T_base = a + b·sd, 网格搜索让4点的(angle_err + power_err*权重)最小
const G=430,MASS=0.23,PF=0.004332712;
const tests=[
  {sd:10,ws:20,a:84.4,p:3.86},
  {sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},
  {sd:40,ws:21,a:68.4,p:3.97},
];
// 对给定(a,b), 算每个点的pred角度/力度
function predAt(sd, ws, T_base_a, T_base_b){
  const wa=90;
  const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=Math.max(0,ws-1);
  const xA=cosW*force/MASS;
  const wy_acc=sinW*force/MASS;
  const effGrav=G-wy_acc;
  const dT=0.0243-0.00066*wy_acc;
  const T=(T_base_a+T_base_b*sd)+dT;
  const xDist=sd*40;
  const denom=xDist-0.5*xA*T*T;
  const tanA=(0+0.5*effGrav*T*T)/denom;
  const angle=Math.atan(tanA)*180/Math.PI;
  const V=denom/(Math.cos(angle*Math.PI/180)*T);
  const power=V*PF;
  return {angle,power,T};
}
// 网格搜索 a, b
let best=null;
for(let a=5.05;a<=5.30;a+=0.001){
  for(let b=-0.008;b<=-0.002;b+=0.0001){
    let sA=0,sP=0;
    for(const t of tests){
      const r=predAt(t.sd,t.ws,a,b);
      sA+=Math.abs(r.angle-t.a);
      sP+=Math.abs(r.power-t.p);
    }
    // 综合误差: 角度MAE + 力度MAE*10 (力度权重, 0.1力度≈1度的重要性)
    const score=sA/4 + (sP/4)*10;
    if(!best||score<best.score){
      best={a,b,score,maeA:sA/4,maeP:sP/4};
    }
  }
}
console.log('=== 最优系数(角度+力度综合) ===');
console.log(`a=${best.a.toFixed(4)} b=${best.b.toFixed(5)}  MAE_A=${best.maeA.toFixed(3)}° MAE_P=${best.maeP.toFixed(4)}`);
console.log('');
// 对比当前5.1541-0.00462
console.log('=== 对比 ===');
console.log('sd ws | 实测A/P    | 当前(5.1541)      最优('+best.a.toFixed(3)+')');
for(const t of tests){
  const rc=predAt(t.sd,t.ws,5.1541,-0.00462);
  const rb=predAt(t.sd,t.ws,best.a,best.b);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p} | ${rc.angle.toFixed(1)}/${rc.power.toFixed(2)} (${(rc.angle-t.a>=0?'+':'')+(rc.angle-t.a).toFixed(1)}/${(rc.power-t.p>=0?'+':'')+(rc.power-t.p).toFixed(2)})  ${rb.angle.toFixed(1)}/${rb.power.toFixed(2)} (${(rb.angle-t.a>=0?'+':'')+(rb.angle-t.a).toFixed(1)}/${(rb.power-t.p>=0?'+':'')+(rb.power-t.p).toFixed(2)})`);
}
