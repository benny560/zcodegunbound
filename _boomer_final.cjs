// 干净版验证: 正确处理 Boomer 弹道在逆风/顺风下的单调性
// 关键洞察：开炮表的"实际角度"是【固定力度3.967，在风下打20sd所需的角度】
// 方法：对每个(ws,wa)，扫描角度20-89，找落点=8的那个

const G = 0.608;
const dt = 0.002;

function traj(power, ang, wa, ws) {
  const Vo = power;
  const rad = ang*Math.PI/180;
  const mass = 85 - ws*ws*0.005;
  const war = wa*Math.PI/180;
  const force = ws;
  const xA = Math.cos(war)*force/mass;
  const effGrav = G - Math.sin(war)*force/mass;
  let x=0, y=0, vx=Vo*Math.cos(rad), vy=Vo*Math.sin(rad), t=0;
  let landingX = null, landingT = null, wentBack=false, prevVx=vx, maxX=0;
  for (let i=0;i<30000;i++){
    vx += xA*dt; vy -= effGrav*dt;
    x += vx*dt; y += vy*dt; t += dt;
    if (vx<0 && prevVx>=0) wentBack=true;
    prevVx = vx;
    if (x>maxX) maxX=x;
    if (y<0 && t>dt) { landingX=x; landingT=t; break; }
  }
  if (landingX===null) { landingX=x; landingT=t; }
  return {landingX, landingT, wentBack, maxX};
}

// 先验证无风各角度落点（力度3.967）
console.log('无风 力度3.967 各角度落点(excelDist, 目标8=20sd):');
for (const a of [50,60,70,75,80,81,85,89]) {
  const r = traj(3.967, a, 0, 0);
  console.log(`  ${a}°: 落点=${r.landingX.toFixed(3)} T=${r.landingT.toFixed(2)}s`);
}
// 81°应≈8

console.log('\n核心验证: 固定力度3.967, 1风正顺风(wa=0), 找落点=8的角度');
console.log('开炮表v4: ws=1,wa=0 → 82.1° (比无风81°抬1.1°)');
// 顺风wa=0把球吹远，要抬高角度让落点回到8
for (let a = 80; a <= 85; a += 0.5) {
  const r = traj(3.967, a, 0, 1);
  console.log(`  ang=${a.toFixed(1)}: 落点=${r.landingX.toFixed(3)} ${Math.abs(r.landingX-8)<0.1?'<-- 命中8':''}`);
}

console.log('\n核心验证: 固定力度3.967, 1风纯逆风(wa=180), 找落点=8的角度');
console.log('物理预期: 逆风把球吹近，要降低角度让落点到8');
for (let a = 70; a <= 82; a += 1) {
  const r = traj(3.967, a, 180, 1);
  const tag = r.wentBack ? '[回旋]' : '';
  console.log(`  ang=${a.toFixed(0)}: 落点=${r.landingX.toFixed(3)} ${tag} ${Math.abs(r.landingX-8)<0.1?'<-- 命中8':''}`);
}

console.log('\n=== Hook 关键场景: 大逆风高角度回旋 ===');
console.log('攻略: ws=4 against 大概率hook, ws>=8 可能 backshot');
for (const ws of [4,6,8,10]) {
  for (const a of [81,85,89]) {
    const r = traj(3.967, a, 180, ws);
    console.log(`  ws=${ws} ang=${a}° P=3.967: 落点=${r.landingX.toFixed(2)} ${r.wentBack?'[回旋]':''} maxAhead=${r.maxX.toFixed(2)}`);
  }
}

// 最终：把开炮表的角度调整和纯物理预测对比（wa=0顺风，这个最简单单调）
console.log('\n=== 纯物理 vs 开炮表v4 (wa=0纯顺风, 力度3.967, 目标8) ===');
console.log('ws  表角度   物理角度  偏差');
const table = {1:82.1, 2:83.3, 3:84.4, 4:85.5, 5:86.7};
for (const ws of [1,2,3,4,5]) {
  // 扫描找落点=8
  let best=null;
  for (let a=70; a<=89.99; a+=0.05) {
    const r = traj(3.967, a, 0, ws);
    if (Math.abs(r.landingX-8) < 0.05) { best=a; break; }
  }
  const exp = table[ws];
  const err = best!==null ? best-exp : null;
  console.log(`${ws}   ${exp}    ${best!==null?best.toFixed(2):'N/A'}   ${err!==null?(err>=0?'+':'')+err.toFixed(2):'N/A'}`);
}
