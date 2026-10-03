// wa=338 = 顺风为主. 顺风对飞行时间T的影响, 物理推导:
//
// 飞行时间 T 由垂直运动决定: T = 2*vy/g_eff (平地)
//   vy = V*sin(angle)  发射垂直速度
//   g_eff = g - wy_acc, wy_acc=sin(wa)*force/mass
//
// wa=338: wy_acc<0(下风分量), 所以 g_eff = g - (负值) = g + |wy_acc| > g
//   => 下风使等效重力变大 => 同样vy下, T = 2*vy/g_eff 变小
//   => 下风缩短T! (球被更快压回地面)
//
// 但要打中目标, 玩家会调整. 实测89.3度/3.98:
const G=430,MASS=0.23,PF=0.004332712;
const wa=338,ws=26;
const wr=wa*Math.PI/180;
const force=Math.max(0,ws-1);
const wy_acc=Math.sin(wr)*force/MASS;
const g_eff=G-wy_acc;
const V=3.98/PF, vy=V*Math.sin(89.3*Math.PI/180);
const T=2*vy/g_eff;
console.log('wa=338 ws=26 实测89.3/3.98:');
console.log(`  wy_acc=${wy_acc.toFixed(2)} (下风)  g_eff=${g_eff.toFixed(1)} (>g=430)`);
console.log(`  vy=${vy.toFixed(1)}  T=2*vy/g_eff=${T.toFixed(3)}`);
//
// 关键: 顺风(xA>0)对T无直接影响! T只由vy和g_eff(垂直)定.
// 顺风改变的是落点水平位置, 要修正落点得调vx(角度), 不改T.
//
// 所以cap的逻辑"顺风缩T"从物理上是错的!
// 顺风不缩T, 而是提高角度(减小vx)来抵消风的推送.
// denom = xDist - 0.5*xA*T^2 变小, tanA变大, angle变大 -> 这是正确响应!
//
// 那denom<0怎么办? 物理上, 如果0.5*xA*T^2 > xDist,
// 意味着【即使vx=0(90度), 风的推送也让球飞过目标】.
// 此时确实无抛物线解. 但Trico是旋转命中, 不靠落点.
//
// 总结:
console.log('\n=== T 的物理 ===');
console.log('T = 2*vy/g_eff, 只由垂直运动定.');
console.log('下风(wy_acc<0): g_eff增大, T缩短. (wa=338的下风分量确实缩T)');
console.log('顺风(xA>0): 对T无直接影响, 只改落点, 靠调角度补偿.');
console.log('');
console.log('=> 当前dT = 0.0243 - 0.00066*wy_acc 方向对(下风缩T, wy_acc<0时dT增大? 检查)');
console.log('   wy_acc<0时: -0.00066*wy_acc = 正值, dT = 0.0243+正 = 增大!');
console.log('   但物理上下风应该【缩短】T, dT该是负的! 当前公式方向反了!');
