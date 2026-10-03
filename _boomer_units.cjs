// 修正量纲：搞清楚 Excel Boomer 的物理到底用哪套单位
// 关键矛盾点排查：
//   开炮表 v4 说: g=0.608, 质量85-0.005*w², 力度=Vo
//   但 HTML TANKS.boomer: gravity=324, mass=0.145
//   而 EXCEL_VEHICLE.boomer: gravity=0.608, massBase=85
// 两套完全不同的数！必须搞清楚哪套是"真物理"，哪套是换算后的。
//
// 推理：
//   1) 开炮表 v4 明确写 "质量85−0.005·w²" → 这是 massBase=85 体系
//      且 w=0 时 mass=85, w=20 时 mass=85-2=83。质量是个大数(~85)。
//   2) HTML TANKS.boomer mass=0.145 → 这是 GME/OpenBound 体系(质量0.1~0.3)
//   3) 这两套不可混用。Excel 公式用大质量85，力度的含义也不同。
//
// 让我从"无风20sd力度"反推真物理。
// 开炮表 v4: 81°→3.967 打 20sd(800px), 70°→2.751, 50°→2.222
// 假设 Excel 体系: 距离=800px, g=0.608, mass=85(w=0), Vo=力度直接
//   无风抛物线: x = Vo*cos*t, y = Vo*sin*t - 0.5*g*t²
//   落地 y=0: t = 2*Vo*sin/g
//   x = Vo*cos * 2*Vo*sin/g = Vo²*sin(2a)/g
//   => Vo² = x*g/sin(2a)
//   81°: sin(162°)=0.309, Vo²=800*0.608/0.309=1573.4, Vo=39.67 → 力度3.967? 差10倍
//   70°: sin(140°)=0.643, Vo²=800*0.608/0.643=756.6, Vo=27.5 → 力度2.751? 差10倍
//   50°: sin(100°)=0.985, Vo²=800*0.608/0.985=494.1, Vo=22.2 → 力度2.222? 差10倍
// 完美！Vo = 力度*10。所以 Excel 里 力度=Vo/10。
//
// 那么 distanceScale=0.4 是什么？
//   HTML: excelDist = distance * 0.4，即 20sd → excelDist=8
//   但上面我用 800px 算对了。说明 Excel 内部用 excelDist=8(=20*0.4)，
//   而不是 800px！让我用 excelDist=8 重算：
//   81°: Vo²=8*0.608/0.309=15.73, Vo=3.967 ✓✓✓ 完全吻合！
//   所以 Excel 真实单位: 距离=sd*0.4, 重力=0.608, 力度=Vo, mass=85

const G = 0.608;
const MASS0 = 85; // 无风质量

function Vo_from_power_angle_dist_20sd(ang) {
  // 无风落地 x=Vo²*sin(2a)/g, x=8 (20sd*0.4)
  const rad = ang*Math.PI/180;
  const Vo = Math.sqrt(8 * G / Math.sin(2*rad));
  return Vo;
}

console.log('量纲修正验证 — Excel Boomer 真实单位体系:');
console.log('  距离=sd*0.4 (20sd→8), 重力g=0.608, 无风质量=85, 力度=Vo');
console.log('  无风公式: Vo² = dist·g/sin(2a), dist=8 for 20sd\n');
console.log('  开炮表v4: 81°→3.967, 70°→2.751, 50°→2.222');
for (const a of [50,70,81]) {
  const Vo = Vo_from_power_angle_dist_20sd(a);
  console.log(`  ${a}°: 计算Vo=${Vo.toFixed(3)} ${Math.abs(Vo-[2.222,2.751,3.967][[50,70,81].indexOf(a)])<0.01?'✓吻合':'✗'}`);
}

// 现在搞清楚风了。Excel 风公式(CURRENT_SHOOTING_MODEL 3.2):
//   xA = cos(wa)*windStrength/mass, effGrav = g - sin(wa)*windStrength/mass
// mass=85(大!)。风加速度被大质量大幅削弱。
// w=0时 mass=85, wA 很小。
// 但 Boomer 的"轻"体现在哪里？对比 Turtle mass=149-w²*0.02(w=0→149)
//   Boomer mass=85 比 Turtle 149 小 → Boomer 确实更"轻"，受风影响更大。
// 这就是 Boomer 容易 hook 的原因：质量小(85) → 同样风力的 xA 更大 → 更易回旋。

console.log('\n风加速度对比 (mass 分母):');
for (const [name, m0, coeff] of [['Boomer',85,0.005],['Turtle',149,0.02]]) {
  for (const w of [0,10,20]) {
    const m = m0 - w*w*coeff;
    console.log(`  ${name} w=${w}: mass=${m.toFixed(1)}, ws=10时 xA量级=${(10/m).toFixed(4)}`);
  }
}

// 关键：逆风下闭式解何时失效
// BOMB 固定时间打法 T=3.00098, 距离 sd
// denom = excelDist - 0.5*xA*T²
// xA = cos(180°)*ws/mass = -ws/mass (逆风)
// denom = sd*0.4 - 0.5*(-ws/mass)*T² = sd*0.4 + 0.5*ws*T²/mass > 0 恒正!
// 所以 BOMB(固定时间) 在逆风下 denom 恒正，闭式解【不失效】。
// 但这意味着 BOMB 打法【无法表达回旋】——闭式解假设球单向飞到 x=excelDist，
// 实际球可能已回旋。闭式解给的是"假解"。

console.log('\n关键：BOMB固定时间法在逆风下的物理');
console.log('  T=3.00098, denom = sd*0.4 + 0.5*ws*T²/mass (逆风, 恒正)');
console.log('  → 闭式解【永远有效】，但它假设球飞到 x=sd*0.4 单向落地');
console.log('  → 真实弹道可能已回旋（球先飞右再飞回左），闭式解给的是【假解】\n');

// 数值积分验证：用真单位(sd*0.4距离, g=0.608, mass=85)看回旋
function sim(power, ang, wa, ws, dt=0.02, tmax=8) {
  const Vo = power; // Excel力度=Vo
  const rad = ang*Math.PI/180;
  const mass = 85 - ws*ws*0.005;
  const war = wa*Math.PI/180;
  const force = ws;
  const xA = Math.cos(war)*force/mass;
  const effGrav = G - Math.sin(war)*force/mass;
  let vx = Vo*Math.cos(rad), vy = Vo*Math.sin(rad);
  let x=0, y=0, t=0;
  let maxX=0, wentBack=false;
  const pts=[];
  while (t < tmax) {
    pts.push({x,y,t,vx});
    if (x>maxX)maxX=x;
    if (vx<0 && pts.length>=2 && pts[pts.length-2].vx>=0) wentBack=true;
    vx += xA*dt;
    vy -= effGrav*dt;
    x += vx*dt;
    y += vy*dt;
    t += dt;
    if (y<0 && t>dt) break;
  }
  return {landingX:x, landingT:t, maxX, wentBack, finalVx:vx, pts};
}

console.log('数值积分(真单位: dist=sd*0.4, g=0.608, mass=85-w²*0.005):');
console.log('目标20sd=excelDist8, 无风81°→3.967\n');

// 无风对照
for (const a of [50,70,81]) {
  const r = sim([2.222,2.751,3.967][[50,70,81].indexOf(a)], a, 0, 0);
  console.log(`  无风 ${a}° 表力度: 落点x=${r.landingX.toFixed(3)} (目标8.000) ${Math.abs(r.landingX-8)<0.05?'✓':'✗'} T=${r.landingT.toFixed(2)}s`);
}

console.log('\n逆风(wa=180) Hook/Backshot 回旋测试:');
console.log('(攻击方向+x右, 逆风把球吹向-x左, 回旋=球先右后左)');
for (const ws of [2,4,6,8,10,15,20,25]) {
  const r = sim(3.967, 81, 180, ws); // 用无风81°的力度
  const r70 = sim(2.751, 70, 180, ws);
  const tag = r.wentBack ? '回旋' : '直线';
  const tag70 = r70.wentBack ? '回旋' : '直线';
  console.log(`  ws=${ws}: 81°P3.97 落x=${r.landingX.toFixed(2)}[${tag}] max=${r.maxX.toFixed(2)} | 70°P2.75 落x=${r70.landingX.toFixed(2)}[${tag70}]`);
}

console.log('\n对照攻略关键论断:');
console.log('  CreeDo: "wind 4 against will hook in most wind directions"');
console.log('  CreeDo: "Wind below 6 is generally not going to blow back except maybe for very close shots"');
console.log('  CreeDo: "For wind at 8 or more, there is a chance a shot will blow backwards"');
console.log('  CreeDo: "Angle 89 never flies back"');
