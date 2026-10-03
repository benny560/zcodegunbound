// 同一个场景(right dist=20 wa=338 ws=26), 两个解:
//   实测/正确: 89.3deg / 3.98  (T=3.875)
//   cap错误:   87.77deg / 3.74 (T=3.666, 被cap砍)
// 问: cap解的 87.77/3.74 在物理上到底中不中? 球会飞到哪?
const G=430,MASS=0.23,PF=0.004332712,sdParts=20,dist=20,elev=0,wa=338,ws=26;
const wr=wa*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS;
const xDist=dist*40;  // 800
const xTarget=xDist;

function simulate(label, angleDeg, power){
  const V=power/PF, aR=angleDeg*Math.PI/180;
  const vx=V*Math.cos(aR), vy=V*Math.sin(aR);
  // 落地时间(y方程): 0.5*g*t^2 - vy*t + elev = 0
  const disc=vy*vy-2*effGrav*elev;
  const tLand=(vy+Math.sqrt(disc))/effGrav;
  const xLand=vx*tLand+0.5*xA*tLand*tLand;
  const yLand=vy*tLand-0.5*effGrav*tLand*tLand;
  // 旋转圈数 (omega 幂律, right)
  const omega=0.023623*Math.pow(V,0.764315);
  const rot=omega*tLand/(2*Math.PI);
  console.log(`${label}:`);
  console.log(`  V=${V.toFixed(1)} vx=${vx.toFixed(2)} vy=${vy.toFixed(2)}`);
  console.log(`  落地T=${tLand.toFixed(3)}  xLand=${xLand.toFixed(1)} (目标${xTarget})  xErr=${(xLand-xTarget).toFixed(1)}`);
  console.log(`  旋转圈数=${rot.toFixed(3)}  (N3需要≈3.0整圈命中)`);
  console.log(`  着陆相位(2π*frac) = ${(2*Math.PI*(rot-Math.floor(rot))).toFixed(3)} rad = ${((rot-Math.floor(rot))*360).toFixed(1)}deg`);
  console.log('');
  return {xLand, rot, tLand};
}

console.log('=== 场景: right dist=20 wa=338 ws=26 elev=0, xTarget=800 ===\n');
const real=simulate('实测 89.3/3.98', 89.3, 3.98);
const cap =simulate('cap错 87.77/3.74', 87.77, 3.74);

console.log('=== 关键对比 ===');
console.log('              xErr(px)   旋转圈数    偏离N3(3圈)');
console.log(`实测 89.3/3.98  ${(real.xLand-xTarget).toFixed(1).padStart(7)}   ${real.rot.toFixed(3).padStart(7)}   ${(real.rot-3).toFixed(3)}`);
console.log(`cap  87.77/3.74 ${(cap.xLand-xTarget).toFixed(1).padStart(7)}   ${cap.rot.toFixed(3).padStart(7)}   ${(cap.rot-3).toFixed(3)}`);
