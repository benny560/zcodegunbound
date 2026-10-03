// 用真实游戏物理(aimbot源码) 重算 Boomer 定力4.0
// 参数: projectile_speed=1.395, gravity=-62.5
// 风公式: ax = int(cos(wa)*ws)*speed, ay = int(sin(wa)*ws)*speed + gravity
// 弹道: x += vx*dt, y += vy*dt, v += a*dt
//
// 关键差异(对比我的错误模型):
//   旧: xA=cos(wa)*ws/mass, effGrav=g-sin(wa)*ws/mass (mass=85)
//   真: ax=int(cos(wa)*ws)*1.395, ay=int(sin(wa)*ws)*1.395-62.5 (无mass除法!)
//   旧模型把风除以85(质量), 真实模型风乘以1.395(速度系数) → 风影响大得多!

const SPEED = 1.395;   // Boomer projectile_speed
const GRAV = -62.5;    // Boomer gravity (负=向下)
const SCREEN_W = 800;

// 真实弹道积分(按aimbot generate_coordinates)
function sim(power, angle, windAngle, windPower, dt=0.05) {
  // aimbot: int(cos)*speed, 注意是int截断!
  const ax = Math.trunc(Math.cos(windAngle*Math.PI/180)*windPower) * SPEED;
  const ay = Math.trunc(Math.sin(windAngle*Math.PI/180)*windPower) * SPEED + GRAV;
  let vx = power * Math.cos(angle*Math.PI/180);
  let vy = power * Math.sin(angle*Math.PI/180);
  let x = 0, y = 0; // y向上为正? aimbot里gravity负=向下, y越大越高
  // aimbot: while y>=0, y += vy*dt, vy += ay*dt (ay含gravity负值)
  // 坐标: y=0是地面, y正向上下? aimbot: target_y = MAX_MAP_Y - target_y 翻转了
  // 简化: 用标准物理 y向上为正, 重力-g, 落地y<0
  const g = 62.5; // 正值, 用于 vy -= g*dt
  let t = 0, maxX = 0, back = false, prevVx = vx;
  const traj = [];
  for (let i = 0; i < 100000; i++) {
    x += vx * dt;
    y += vy * dt;
    traj.push({x, y});
    vx += ax * dt;
    vy -= g * dt; // 重力
    // 风的垂直分量: ay_wind = int(sin(wa)*ws)*speed
    // 如果风有垂直分量(sin(wa)≠0), 它改变 vy
    // aimbot: ay = int(sin*ws)*speed + gravity, 所以 vy += ay*dt
    // 但我把gravity拆出来了, 需要加回风的垂直分量
    // 重做: 不拆, 直接用 ay
    t += dt;
    if (vx < 0 && prevVx >= 0) back = true;
    prevVx = vx;
    if (x > maxX) maxX = x;
    if (y < 0 && t > dt) break;
  }
  return {x, maxX, back, t, traj};
}

// 重写干净的sim
function sim2(power, angle, windAngle, windPower, dt=0.02) {
  const ax = Math.trunc(Math.cos(windAngle*Math.PI/180)*windPower) * SPEED;
  const ayWind = Math.trunc(Math.sin(windAngle*Math.PI/180)*windPower) * SPEED;
  const g = 62.5;
  let vx = power * Math.cos(angle*Math.PI/180);
  let vy = power * Math.sin(angle*Math.PI/180);
  let x = 0, y = 0, t = 0, maxX = 0, back = false, prevVx = vx;
  for (let i = 0; i < 100000; i++) {
    x += vx * dt;
    y += vy * dt;
    vx += ax * dt;
    vy += ayWind * dt;  // 风的垂直分量(正=上风托住, 负=下风压下)
    vy -= g * dt;       // 重力
    t += dt;
    if (vx < 0 && prevVx >= 0) back = true;
    prevVx = vx;
    if (x > maxX) maxX = x;
    if (y < 0 && t > dt) break;
  }
  return {x, maxX, back, t};
}

console.log('═'.repeat(60));
console.log('  Boomer 真实物理 (aimbot源码: speed=1.395, g=62.5)');
console.log('  风: ax=int(cos(wa)*ws)*1.395, ay=int(sin(wa)*ws)*1.395');
console.log('═'.repeat(60));

// power 0-400 (aimbot用0-400, 对应力度条). 4.0力=400? 还是比例?
// aimbot: for power in range(400+1), power直接乘cos/sin
// 力度条满=400(内部), 显示约4.0? 实际游戏力度条0-4.0对应内部0-400?
// aimbot的power是0-400整数, speed_x = power*cos(angle), power=400满力
// 所以"4.0力" = 内部400
console.log('\n4.0力(=内部400) 各角度无风落点(像素→sd, 800px=20sd):');
for (const a of [60,65,70,75,80,85]) {
  const r = sim2(400, a, 0, 0);
  console.log(`  ${a}°: 落点${(r.x/800*20).toFixed(1)}sd (maxX=${(r.maxX/800*20).toFixed(1)}sd)`);
}

console.log('\n4.0力 135°风 ws=2, 各角度:');
for (const a of [55,60,65,70,75,80,85]) {
  const r = sim2(400, a, 135, 2);
  console.log(`  ${a}°: 落点${(r.x/800*20).toFixed(1)}sd (max${(r.maxX/800*20).toFixed(1)}) ${r.back?'[回旋]':''}`);
}

// 找10/20/30sd的角度
console.log('\n═ 定力4.0(内部400) 算角, 135°风 ws=2 ═');
function findAngle(power, wa, ws, targetSd) {
  const target = targetSd * 800 / 20;
  let best = null, bestE = Infinity;
  for (let a = 20; a <= 89; a += 0.5) {
    const r = sim2(power, a, wa, ws);
    const e = Math.abs(r.x - target);
    if (e < bestE) { bestE = e; best = a; }
  }
  // 精化
  for (let a = best - 0.5; a <= best + 0.5; a += 0.05) {
    const r = sim2(power, a, 135, 2);
    if (Math.abs(r.x - target) < bestE) { bestE = Math.abs(r.x - target); best = a; }
  }
  return {angle: best, err: bestE};
}
for (const sd of [10, 20, 30]) {
  const r = findAngle(400, 135, 2, sd);
  console.log(`  ${sd}sd → ${r.angle.toFixed(1)}° (误差${(r.err/800*20).toFixed(2)}sd)`);
}
