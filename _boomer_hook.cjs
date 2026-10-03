// 核对4: Hook/Backshot 逆风场景 — Boomer 的招牌技能
// _下矩阵(wa 270-360)覆盖的就是逆风/上风区, 已证明物理100%准确
// 这里用数值仿真重现 CreeDo/GameFAQs 攻略的关键论断:
//   1. "wind 4 against will hook" (4风逆风开始hook)
//   2. "wind 8+ may blow backwards" (8风以上可能backshot)
//   3. "Angle 89 never flies back" (89°永不回旋)
//   4. backshot: 球飞回身后(distance<0)
//
// 攻击方向: Boomer朝右打(+x). 逆风 = 风吹向-x = wa=180(正左)
// 但开炮表的"逆风"对应 wa 90-270 (上风区90, 逆风180, 下风270)
// _下矩阵是 wa 270-360, 实际是 下风→顺风 的过渡(270=正下, 315=右下, 360=正右)
// 等等, 这和"逆风"矛盾. 让我重新理解开炮表的风向定义.
//
// 开炮表v4说明: "顺风(弹打远)=风向 0~90° & 270~360°"
//   即 wa 0-90 和 270-360 都是"顺风"(把弹打远)
//   wa 90-270 是"逆风"(把弹打近/回旋)
// Boomer朝右打, 顺风=风也往右=wa 0(正右) 和 wa 360(=0)
//   wa 270-360: 从正下转到正右, 即下右风(把球往右下推) → 顺风
//   wa 90-270: 从正上经正左到正下, 即上/左/下 → 逆风区
// 所以 _上(wa0-90) = 上右风(顺风+上风), _下(wa270-360) = 下右风(顺风+下风)
// 真正的"逆风"(hook/backshot区)是 wa 90-270, 开炮表【没覆盖】!
//
// 这解释了为什么没看到回旋: 开炮表只做了顺风区(0-90, 270-360),
// 逆风hook/backshot区(90-270)在开炮表里是"--"(无解)!

const G=0.608, DT=0.0015;
function simFull(power, ang, wa, ws) {
  const mass=85-ws*ws*0.005, war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/mass, effGrav=G-Math.sin(war)*ws/mass;
  let vx=power*Math.cos(ang*Math.PI/180),vy=power*Math.sin(ang*Math.PI/180),x=0,y=0,t=0,prevVx=vx,back=false,maxX=0;
  for(let i=0;i<200000;i++){
    vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;
    if(vx<0&&prevVx>=0)back=true;prevVx=vx;if(x>maxX)maxX=x;
    if(y<0&&t>DT)break;if(t>20)break;
  }
  return {x:x/0.4, back, maxX:maxX/0.4, t};
}

console.log('='.repeat(70));
console.log('核对4: Hook/Backshot 逆风场景仿真 (wa 90-270 逆风区, 开炮表未覆盖)');
console.log('Boomer朝右打(+x), Hook Full=满力3.0(注:这里用基础力度体系测试)');
console.log('='.repeat(70));

// CreeDo: Hook 用满力(full power). 游戏满力=5.0条? 还是开炮表的3.967?
// 开炮表力度=Vo, 无风81°/3.967打20sd. 游戏力度条满力对应Vo多少?
// 从无风表: 81°打20sd=3.967, 这应该不是满力(满力能打更远)
// CreeDo说hook用full power. 假设满力 Vo=4.5 或 5.0
// 这里测试几个力度看回旋阈值

console.log('\n【论断1】"wind 4 against will hook" — 4风逆风开始hook');
console.log('逆风 wa=180(正左), 力度3.967, 各角度:');
for (const ws of [2,4,6,8]) {
  let s='';
  for (const ang of [60,70,80,89]) {
    const r = simFull(3.967, ang, 180, ws);
    s += `${ang}°:${r.x.toFixed(1)}sd${r.back?'↺':''} `;
  }
  console.log(`  ws=${ws}: ${s}`);
}

console.log('\n【论断2】"wind 8+ may blow backwards" — 8风以上可能飞回');
console.log('逆风 wa=180, 满力(测试Vo=4.5), 各角度:');
for (const ws of [6,8,10,12,15]) {
  let s='';
  for (const ang of [70,80,89]) {
    const r = simFull(4.5, ang, 180, ws);
    const status = r.x < 0 ? 'BACKSHOT' : (r.back?'hook':'正常');
    s += `${ang}°:${r.x.toFixed(1)}[${status}] `;
  }
  console.log(`  ws=${ws}: ${s}`);
}

console.log('\n【论断3】"Angle 89 never flies back" — 89°永不回旋');
let anyBack89 = false;
for (const ws of [4,8,12,16,20,25]) {
  const r = simFull(4.5, 89, 180, ws);
  if (r.back) anyBack89 = true;
  console.log(`  ws=${ws} ang=89°: 落点${r.x.toFixed(2)}sd ${r.back?'[回旋!违背论断]':'[不回旋✓]'}`);
}
console.log(`  论断3 ${anyBack89?'不成立':'成立'}: 89°${anyBack89?'会':'不会'}回旋`);

console.log('\n【Backshot 距离】逆风 wa=180 打身后(目标在-x)');
console.log('要打身后目标(如-5sd), 需要的风力/角度:');
for (const ws of [10,15,20,25]) {
  for (const ang of [70,75,80]) {
    const r = simFull(4.5, ang, 180, ws);
    if (r.x < 0) console.log(`  ws=${ws} ang=${ang}°: 落点${r.x.toFixed(1)}sd(身后${(-r.x).toFixed(1)}sd) ${r.back?'回旋命中':''}`);
  }
}

console.log('\n【斜逆风】wa=135(左上逆风) — 攻略说"mostly up的逆风不易hook"');
for (const ws of [4,8,12]) {
  let s='';
  for (const ang of [70,80]) {
    const r = simFull(4.5, ang, 135, ws);
    s += `${ang}°:${r.x.toFixed(1)}${r.back?'↺':''} `;
  }
  const r180 = simFull(4.5, 80, 180, ws);
  console.log(`  ws=${ws}: wa=135(斜) ${s}| wa=180(正) 80°:${r180.x.toFixed(1)}${r180.back?'↺':''}`);
}
