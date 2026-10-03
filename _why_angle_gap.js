// 同样的T_exact(从实测反推), 喂回求解器, 角度却偏高0.5-0.9°.
// 问题在哪? 检查求解器公式 vs 实测的物理.
//
// 求解器用: tanA = (elev + 0.5·effGrav·T²) / (xDist - 0.5·xA·T²)
// 实测的T是从 y方程反推: T=2vy/effGrav (平地落地)
//
// 关键: 实测角度a=84.4, 对应vy=V·sin(a). 求解器算的vy呢?
const G=430,MASS=0.23,PF=0.004332712;
const t={sd:10,ws:20,a:84.4,p:3.86};
const force=Math.max(0,t.ws-1);
const wya=Math.sin(90*Math.PI/180)*force/MASS,eg=G-wya;
const xA=Math.cos(90*Math.PI/180)*force/MASS; // 0
const V=t.p/PF;
// 实测
const vy_real=V*Math.sin(t.a*Math.PI/180);
const vx_real=V*Math.cos(t.a*Math.PI/180);
const T_real=2*vy_real/eg;
const xLand_real=vx_real*T_real+0.5*xA*T_real*T_real;
const xDist=t.sd*40;
console.log(`sd=${t.sd} 实测${t.a}°/${t.p}:`);
console.log(`  vy_real=${vy_real.toFixed(2)} vx_real=${vx_real.toFixed(2)}`);
console.log(`  T_real=${T_real.toFixed(4)} (y方程)`);
console.log(`  xLand_real=${xLand_real.toFixed(2)} (目标xDist=${xDist})`);
console.log('');
// 求解器用T_real反算角度:
const denom=xDist-0.5*xA*T_real*T_real;
const tanA=(0+0.5*eg*T_real*T_real)/denom;
const a_solver=Math.atan(tanA)*180/Math.PI;
const V_solver=denom/(Math.cos(a_solver*Math.PI/180)*T_real);
console.log(`求解器用T_real=${T_real.toFixed(4)}反算:`);
console.log(`  tanA=${tanA.toFixed(4)} -> angle=${a_solver.toFixed(2)}° (实测${t.a}°, 差${(a_solver-t.a).toFixed(2)})`);
console.log(`  V_solver=${V_solver.toFixed(2)} power=${(V_solver*PF).toFixed(4)}`);
console.log('');
// 为什么求解器角度偏高? 看vy
const vy_solver=V_solver*Math.sin(a_solver*Math.PI/180);
console.log(`  vy_solver=${vy_solver.toFixed(2)} vs vy_real=${vy_real.toFixed(2)} 差${(vy_solver-vy_real).toFixed(2)}`);
console.log('');
// xLand_solver
const xLand_solver=V_solver*Math.cos(a_solver*Math.PI/180)*T_real+0.5*xA*T_real*T_real;
console.log(`  xLand_solver=${xLand_solver.toFixed(2)} (=xDist=${xDist}, 落点准)`);
console.log('');
console.log('=== 矛盾 ===');
console.log(`实测: vy=${vy_real.toFixed(1)}, vx=${vx_real.toFixed(1)}, T=${T_real.toFixed(3)}`);
console.log(`  -> xLand = ${xLand_real.toFixed(1)} (目标${xDist})`);
console.log(`求解器: 同样T, 解出vy=${vy_solver.toFixed(1)}, vx=${(V_solver*Math.cos(a_solver*Math.PI/180)).toFixed(1)}`);
console.log(`  -> xLand = ${xLand_solver.toFixed(1)} (=目标${xDist})`);
console.log('');
console.log('两个都落在xDist, 但vy不同! 原因: 实测的xLand可能不等于xDist(Trico旋转命中, 落点≠目标)');
console.log(`实测xLand=${xLand_real.toFixed(1)} vs xDist=${xDist}, 差${(xLand_real-xDist).toFixed(1)}`);
