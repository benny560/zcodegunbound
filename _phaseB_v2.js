// 方向B v2: V由旋转约束定, 不由落点定
// 
// 核心改变: 不再用 denom=xDist 反推V. 而是:
//   1. 旋转约束 ω(V)·T = rotPi·π  =>  给定T, 反推V (注意ω是V的幂律, 需数值反推)
//   2. 角度由"垂直运动"定: tanA = 0.5·effGrav·T² / xLand_effective
//      但xLand_effective未知. 改用: angle由 V的垂直分量和T的关系定.
//      V·sinA·T - 0.5·effGrav·T² = elev  (y方程, 平地elev=0)
//      => sinA = 0.5·effGrav·T / V   (elev=0时)
//      => angle = asin(0.5·effGrav·T / V)
//   3. xLand自由 = V·cosA·T + 0.5·xA·T² (球可以飞过目标)
//
// 这样angle只依赖V和T(垂直运动), 不依赖xDist(落点)!
// xDist只用来事后算"飞过目标多少", 不进angle求解.
const G=430,MASS=0.23,PF=0.004332712;
const omegaRight = V => 0.023623 * Math.pow(V, 0.764315);
// 反推: 给定omega_target, 求V. omega = 0.023623*V^0.764315
// V = (omega/0.023623)^(1/0.764315)
const VfromOmegaRight = om => Math.pow(om/0.023623, 1/0.764315);

function solveV2(sd, ws, rotPiTarget){
  const force=Math.max(0,ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS, eg=G-wya;
  const xA=Math.cos(90*Math.PI/180)*force/MASS;
  const xDist=sd*40;
  let T=4.0;
  for(let i=0;i<200;i++){
    // 给定T, 由旋转约束反推V
    const om_target = rotPiTarget*Math.PI/T;
    const V = VfromOmegaRight(om_target);
    if(!Number.isFinite(V)||V<=0||V>2000) {T*=0.95; continue;}
    // angle由y方程(垂直运动): sinA = 0.5·eg·T/V (elev=0)
    const sinA = 0.5*eg*T/V;
    if(sinA>=1||sinA<=0) {T*=0.95; continue;}
    const angle = Math.asin(sinA)*180/Math.PI;
    const cosA = Math.cos(angle*Math.PI/180);
    // 算xLand(自由, 不约束=xDist)
    const xLand = V*cosA*T + 0.5*xA*T*T;
    // 新T: 由旋转约束(已经用了), 但T应该收敛. 用垂直运动重新算T?
    // 实际上T由旋转约束定了(om_target=rotPi*π/T). 这里T是自洽的.
    // 迭代是为了让初值收敛到正确T.
    const power = V*PF;
    if(power<=0||power>5){T*=0.95;continue;}
    // 收敛检查: 重新算omega和T_new
    const om_check = omegaRight(V);
    const T_new = rotPiTarget*Math.PI/om_check;
    if(Math.abs(T_new-T)<1e-4){
      return {angle, power, T, V, xLand, xDist, xErrSD:(xLand-xDist)/40, turns:om_check*T/(2*Math.PI)};
    }
    T=0.5*(T+T_new);
  }
  return null;
}
console.log('=== 方向B v2: V由旋转约束定, angle由垂直运动定 ===');
console.log('sd ws | 实测 | v2 pred A/P/T/xErrSD');
let mA=0,mP=0;
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},{sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97}]){
  const rp=6.906-0.001204*t.sd;
  const r=solveV2(t.sd,t.ws,rp);
  if(!r){console.log(`sd=${t.sd}: 不收敛`);continue;}
  const eA=r.angle-t.a, eP=r.power-t.p;
  mA+=Math.abs(eA);mP+=Math.abs(eP);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p} | ${r.angle.toFixed(2)}/${r.power.toFixed(3)}/T${r.T.toFixed(3)}/xErr${(r.xErrSD>=0?'+':'')+r.xErrSD.toFixed(2)}SD (${(eA>=0?'+':'')+eA.toFixed(2)}°/${(eP>=0?'+':'')+eP.toFixed(3)})`);
}
console.log(`MAE: dA=${(mA/4).toFixed(2)}° dP=${(mP/4).toFixed(3)}`);
