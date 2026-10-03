// Boomer 回旋物理验证：小质量(mass=0.145)抛物线能否自然产生 hook/backshot？
// 关键问题：当前 HTML 用 g=0.608(Excel内部) / mass=0.145，
//   风公式 xA = cos(wa)*force/mass, effGrav = g - sin(wa)*force/mass
//   force = windStrength (Excel车不乘windInfluence)
// 验证：数值积分弹道，看在逆风下能否"先飞出去再被吹回"（hook/backshot 的特征）
//
// 同时对照：当前 HTML 的 Boomer 用 calcExcelFromTime / calcExcelCenterTrajectory
//   这些是【静态抛物线闭式解】，对"被风吹回"的回旋弹道【理论上无法表达】——
//   因为闭式解假设 (xDist - 0.5*xA*T^2) 是单调的，一旦 xA 大到让炮弹水平速度归零再反向，
//   分母会变号/为零，闭式解直接失效。

const PF = 0.004332712;
const G_EXCEL = 0.608;       // Excel 内部重力 (对应 Boomer revolution 表)
const MASS = 0.145;          // Boomer 质量 (极小！比 Turtle 0.254 / Ice 0.3 都轻)
const DIST_PX_PER_SD = 40;   // 20sd = 800px

// 数值积分弹道（欧拉法，dt=0.02，足够精度）
function simulate(power, angleDeg, windAngleDeg, windStrength, g, mass, x0 = 0, y0 = 0, dt = 0.02, tmax = 12) {
  const V = power / PF;
  const rad = angleDeg * Math.PI / 180;
  let vx = V * Math.cos(rad);
  let vy = V * Math.sin(rad);
  // Excel 风公式
  const force = windStrength;
  const war = windAngleDeg * Math.PI / 180;
  const xA = Math.cos(war) * force / mass;
  const ayWind = Math.sin(war) * force / mass;
  const effGrav = g - ayWind; // y 向下为正时重力加速度；这里 y 向上为正，故 ay = -effGrav + ... 见下
  // 用 y 向上为正，重力向下：ay = -effGrav ... 但 effGrav 已含风y
  // 约定：vx,vy 为像素/秒；y 向上为正；重力使 vy 减少 g_eff 每秒
  let x = x0, y = y0;
  const traj = [{x, y, t:0, vx, vy}];
  let maxX = x0, wentBack = false, apexReached = false;
  for (let t = dt; t <= tmax; t += dt) {
    vx += xA * dt;
    vy -= effGrav * dt;  // 重力 + 下风让 vy 减小
    x += vx * dt;
    y += vy * dt;
    traj.push({x, y, t, vx, vy});
    if (x > maxX) maxX = x;
    if (y > traj[traj.length-2].y) {} // ignore
    if (vx < 0 && traj[traj.length-2].vx >= 0) wentBack = true;
    if (vy < 0 && !apexReached) apexReached = true;
    if (y < 0 && t > dt) break; // 落地（y=0 为发射点高度）
  }
  return { traj, maxX, wentBack, landingX: x, landingT: traj[traj.length-1].t };
}

function fmt(v) { return (Math.round(v*100)/100).toFixed(2); }

console.log('='.repeat(70));
console.log('Boomer 回旋物理验证 — 小质量(m=0.145) + 抛物线 数值积分');
console.log('参数: g=0.608(Excel), mass=0.145, PF=0.004332712');
console.log('风公式: force=windStrength, xA=cos(wa)*force/mass, effGrav=g-sin(wa)*force/mass');
console.log('='.repeat(70));

// 测试1：无风 20sd 各角度的力度（对照开炮表 v4: 81°→3.967, 70°→2.751, 50°→2.222）
console.log('\n【测试1】无风 20sd 命中所需的力度（数值积分反推，对照开炮表）');
console.log('  开炮表v4: 81°→3.967, 70°→2.751, 50°→2.222');
const targetX = 20 * DIST_PX_PER_SD; // 800px
for (const ang of [50, 70, 81]) {
  // 二分搜索力度使 landingX ≈ 800
  let lo = 0.5, hi = 5;
  for (let it = 0; it < 40; it++) {
    const mid = (lo + hi) / 2;
    const r = simulate(mid, ang, 0, 0, G_EXCEL, MASS);
    if (r.landingX < targetX) lo = mid; else hi = mid;
  }
  const p = (lo + hi) / 2;
  const r = simulate(p, ang, 0, 0, G_EXCEL, MASS);
  console.log(`  ${ang}°: 数值力度=${fmt(p)} (落点${fmt(r.landingX)}px), 飞行T=${fmt(r.landingT)}s`);
}

// 测试2：Hook 关键测试 — 逆风下高角度，炮弹是否"飞出再飞回"
console.log('\n【测试2】Hook 测试：逆风(wa=180°,即正左) 高角度满力，看是否回旋');
for (const ws of [2, 4, 6, 8, 10, 15, 20, 25]) {
  // Boomer Hook Full 满力 3.0，角度高（如70-90）
  for (const ang of [70, 80, 89]) {
    const r = simulate(3.0, ang, 180, ws, G_EXCEL, MASS);
    const back = r.wentBack ? '[回旋!飞回]' : '';
    console.log(`  ws=${ws} ang=${ang}° P=3.0: 落点x=${fmt(r.landingX)}px ${back} (发射点x=0, 飞行T=${fmt(r.landingT)}s)`);
  }
  console.log('');
}

// 测试3：Backshot 测试 — 顺风打身后（distance<0）
console.log('【测试3】Backshot 测试：顺风(wa=0°,正右) 打身后(目标在x<0)');
// 背射需要先朝右打，顺风把球吹到更右边？不对——背射是"朝前打但被逆风吹回身后"
// 重新理解：背射是 wa 与射击方向同向时无法发生；背射发生在【逆风】且高角度低力度，球被吹回
// 攻击方向右(+x)，逆风 wa=180(吹左,-x)，球先飞右再被吹回左 → 落在 x<0 = 身后
console.log('  背射实为逆风(wa=180)高角度低力，球飞回 x<0');
for (const ws of [8, 12, 16, 20, 25]) {
  for (const ang of [70, 80]) {
    // 找一个力度使球飞回 x<0 (身后)
    const r = simulate(3.0, ang, 180, ws, G_EXCEL, MASS);
    const back = r.wentBack ? '[回旋]' : '';
    console.log(`  ws=${ws} ang=${ang}° P=3.0: 落点x=${fmt(r.landingX)}px ${back}`);
  }
  console.log('');
}

// 测试4：关键 — 闭式解(closed-form)在逆风下何时失效
console.log('【测试4】闭式解失效分析：calcExcelFromTime 的 denom = xDist - 0.5*xA*T^2');
console.log('  当 denom<=0 时闭式解失效（分母为负/零），这正是球水平速度归零要回旋的点');
const conv = 0.4; // distanceScale: sd*0.4 = excelDist
for (const ws of [2, 4, 8, 15, 25]) {
  for (const sd of [5, 10, 20]) {
    const xDist = sd * conv; // Excel 内部距离
    const force = ws;
    const xA = Math.cos(Math.PI) * force / MASS; // wa=180, cos=-1
    // BOMB 固定时间
    const T = 3.00098;
    const denom = xDist - 0.5 * xA * T * T;
    const fail = denom <= 0 ? '【闭式解失效】' : '';
    console.log(`  ws=${ws} sd=${sd}: xDist=${fmt(xDist)} xA=${fmt(xA)} T=3.0 denom=${fmt(denom)} ${fail}`);
  }
  console.log('');
}
