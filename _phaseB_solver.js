// 方向B: 旋转相位约束求解器 - vm沙箱测试版
// 核心约束: ω(V)·T = rot_pi(sd)·π, 迭代求解
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];

// rot/pi(sd) 多项式系数 [c0, c1, c2]
const ROTPI_POLY = {
  right: { 2:[2.9244,-0.02620,0.0007192], 3:[5.4193,-0.01912,0.0002769], 4:[7.9144,-0.01168,0.0001761] },
  left:  { 2:[3.1883,-0.01990,0.0000615], 3:[5.4637,-0.01490,0.0000595], 4:[7.7391,-0.00990,0.0000575] }
};
// omega 幂律
const omegaRight = V => 0.023623 * Math.pow(V, 0.764315);
const omegaLeft  = V => 0.687878 * Math.pow(V, 0.299291);

const G=430,MASS=0.23,PF=0.004332712;

// 旋转相位约束求解器
function calcPhaseConstraintSolver(sdParts, side, spinN, distance, elevationInternal, windAngle, windStrength){
  if(distance<0) return null; // 背射走旧路径
  if(spinN===1) return null;  // N1走旧路径
  const poly = ROTPI_POLY[side]?.[spinN];
  if(!poly) return null;
  const sd = Math.abs(distance);
  const rotPi = poly[0] + poly[1]*sd + poly[2]*sd*sd;
  // 风参数(与落地时间求解器一致)
  const windRad = windAngle*Math.PI/180;
  const cosW = Math.cos(windRad), sinW = Math.sin(windRad);
  const ws = Math.max(0, windStrength||0);
  const force = ws===0 ? 0 : (Math.abs(cosW+1)<0.001 ? ws : Math.max(0,ws-1));
  const xA = cosW*force/MASS;
  const effGrav = G - sinW*force/MASS;
  if(effGrav<=0) return null;
  const xDist = sd*(800/sdParts);
  const elev = elevationInternal;
  const omegaFn = side==='left' ? omegaLeft : omegaRight;
  // 初值: 用 T_base+dT (复用现有模型加速收敛)
  // 这里先用粗初值 4.0, 让迭代自己找
  let T = 4.0;
  let converged = false;
  for(let iter=0; iter<100; iter++){
    const denom = xDist - 0.5*xA*T*T;
    if(denom <= 0.001) { T *= 0.95; continue; } // denom太小,缩T
    const tanA = (elev + 0.5*effGrav*T*T)/denom;
    if(tanA<=0) { T *= 0.95; continue; }
    const angle = Math.atan(tanA)*180/Math.PI;
    if(angle<1) { T *= 0.95; continue; }
    const cosA = Math.cos(angle*Math.PI/180);
    if(cosA<=0.001) { T *= 0.95; continue; }
    const V = denom/(cosA*T);
    if(V<=0||V>2000||!Number.isFinite(V)) { T *= 0.95; continue; }
    const power = V*PF;
    if(power<=0||power>5) { T *= 0.95; continue; }
    const om = omegaFn(V);
    const T_new = rotPi*Math.PI/om;
    if(!Number.isFinite(T_new)||T_new<=0) { T *= 0.95; continue; }
    if(Math.abs(T_new - T) < 1e-4){ converged=true; break; }
    T = 0.5*(T + T_new); // 阻尼
  }
  if(!converged) return null;
  // 最终解
  const denom = xDist - 0.5*xA*T*T;
  if(denom<=0.001) return null;
  const tanA = (elev + 0.5*effGrav*T*T)/denom;
  const angle = Math.atan(tanA)*180/Math.PI;
  if(angle<1) return null;
  const cosA=Math.cos(angle*Math.PI/180), sinA=Math.sin(angle*Math.PI/180);
  if(cosA<=0.001||sinA<=0.001) return null;
  const V = denom/(cosA*T);
  const power = +(V*PF).toFixed(4);
  if(power<=0||power>5) return null;
  // 构造轨迹(与落地时间求解器相同格式)
  const angleRad=angle*Math.PI/180;
  const trajectory=[];
  const vx_f=V*Math.cos(angleRad), vy_f=V*Math.sin(angleRad);
  for(let i=0;i<=200;i++){
    const tt=(i/200)*T;
    trajectory.push({x:vx_f*tt+0.5*xA*tt*tt, y:vy_f*tt-0.5*effGrav*tt*tt});
  }
  const turns = omegaFn(V)*T/(2*Math.PI);
  return {
    angle:+angle.toFixed(4), angleRaw:+angle.toFixed(2), velocity:+V.toFixed(2),
    xVelocity:+(V*Math.cos(angleRad)).toFixed(2), yVelocity:+(V*Math.sin(angleRad)).toFixed(2),
    time:+T.toFixed(4), power, powerRaw:power, powerAtAngleRaw:power,
    trajectory, maxHeight:null, effectiveGravity:+effGrav.toFixed(6), xA:+xA.toFixed(6),
    windMass:MASS, source:'旋转相位约束', phaseConstraintSolver:true, spinTableTime:null,
    windForce:+force.toFixed(4), minHitDist:null,
    turns:+turns.toFixed(4), rotPi:+rotPi.toFixed(4)
  };
}

// ===== 测试 =====
console.log('=== 测试1: 4个right:4标准点 (wa=90 ws=20) ===');
console.log('sd ws | 实测A/P    | 方向B pred A/P/T/turns  | err');
const tests=[
  {sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97},
];
let mA=0,mP=0;
for(const t of tests){
  const r=calcPhaseConstraintSolver(20,'right',4,t.sd,0,90,t.ws);
  if(!r){console.log(`sd=${t.sd}: NULL`);continue;}
  const eA=r.angle-t.a, eP=r.power-t.p;
  mA+=Math.abs(eA); mP+=Math.abs(eP);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p}  | ${r.angle.toFixed(2)}/${r.power.toFixed(3)}/T${r.time.toFixed(3)}/${r.turns} | ${(eA>=0?'+':'')+eA.toFixed(2)}°/${(eP>=0?'+':'')+eP.toFixed(3)}`);
}
console.log(`4标准点 MAE: dA=${(mA/4).toFixed(2)}° dP=${(mP/4).toFixed(3)} (目标 dA<0.3 dP<0.03)`);

console.log('\n=== 测试2: 图片N4场景 (左4 sd=33 wa=90 ws=12) ===');
const img=calcPhaseConstraintSolver(20,'left',4,33,0,90,12);
console.log('方向B:', img?`${img.angle.toFixed(2)}/${img.power.toFixed(4)}/T${img.time.toFixed(3)}/turns${img.turns}`:'NULL');
console.log('实测附近(左4 sd=33 wa=68 ws=11): 69/4.0');
console.log('旧v1.07: 70.41/3.8720');
