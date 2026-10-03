// 物理推导: 水平风 xA 对飞行时间 T 的影响
//
// 抛物线运动(有风):
//   x(t) = vx*t + 0.5*xA*t^2
//   y(t) = vy*t - 0.5*g*t^2
// 落地条件 y(T)=0 (平地): T = 2*vy/g  (无风时)
//
// 关键: 飞行时间 T 由【垂直运动】决定, 不由水平运动决定!
//   T = 2*vy / g   (纯垂直, 与 xA 无关)
//   风的垂直分量 wy_acc 改变等效重力 g_eff = g - wy_acc, 所以:
//   T = 2*vy / g_eff
//
// 这说明: 水平风 xA 不直接改变飞行时间 T!
//   - 上风(wy_acc>0, g_eff减小): T增大
//   - 下风(wy_acc<0, g_eff增大): T减小
//   - 水平风(xA): T不变
//
// 那为什么实测里顺风球"更快到达"? 因为"到达"是水平距离条件 x(T)=xDist.
// 但飞行时间T本身由垂直运动定, 水平风只改变落点的水平位置, 不改T.
//
// 所以当前 dT = 0.0243 - 0.00066*wy_acc 的【形式】是对的(只响应垂直风)!
// 问题不在 dT 忽略 xA.
//
// 那NULL和0.6°偏差哪来的? 重新审视:
// 求解器流程: 先定 T = T_base + dT, 再用 T 解 angle/power 满足 x(T)=xDist.
// denom = xDist - 0.5*xA*T^2 爆炸, 是因为给定T下, 水平风的位移 0.5*xA*T^2 太大.
// 但这恰恰是物理正确的! 如果风把球吹太远, 那就是打不过去, 要么换角度(更陡减少vx).
// tanA = (elev + 0.5*g_eff*T^2) / (xDist - 0.5*xA*T^2)
// 当 xA 大时, 分母小, tanA 大, angle 大 -> 角度飙高, 这是物理正确的!
// (顺风大角度高抛, 让vx小, 抵消风的水平推力)
//
// 真正的极限: 当 xA*T^2/2 >= xDist, 即使vx=0(90度垂直射), 风也能把球吹过目标.
// 此时【确实无解】——球必然飞过目标. 这是物理事实, 不是bug.
//
// 验证: 这3个NULL场景, 物理上是否真的无解?
const G=430,MASS=0.23,PF=0.004332712;
const cases=[
  ['右3 sd=15 wa=0 ws=26', 3, 15, 0, 26, 0],     // effWa=0
  ['右3 sd=10 wa=0 ws=24', 3, 10, 0, 24, 0],
  ['右3 sd=18 wa=10 ws=24',3, 18, 10, 24, 0],
];
console.log('=== 3个NULL场景: 物理上是否真无解? ===');
for(const [lbl,n,dist,wa,ws,elev] of cases){
  const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=Math.max(0,ws-1);
  const xA=cosW*force/MASS;
  const xDist=dist*40;
  // 90度垂直射(vx=0)时, 球的水平位移 = 0.5*xA*T^2, T由垂直运动定
  // 但90度时vy=V, T=2V/g_eff. 实际上垂直射球的水平位移完全由风决定.
  // 无解条件: 任何角度下 x(T) 都 > xDist. 即 vx最小(=0)时 0.5*xA*T^2 > xDist
  // 但T随角度变. 用拟合T_base看:
  const fit={3:{a:4.1243,b:-0.01039}};
  const T_base=fit[n].a+fit[n].b*dist;
  const wy_acc=sinW*force/MASS;
  const dT=0.0243-0.00066*wy_acc;
  const T=T_base+dT;
  const windDrift=0.5*xA*T*T;
  console.log(`${lbl}: xA=${xA.toFixed(1)} xDist=${xDist} T=${T.toFixed(2)}`);
  console.log(`  风的水平位移(假设vx=0): 0.5*xA*T^2 = ${windDrift.toFixed(0)} vs xDist=${xDist}`);
  console.log(`  ${windDrift>xDist?'>> 风把球吹过目标, 但Trico靠旋转可能仍命中':'<< 风位移<目标, 有解空间'}`);
  // 即使风位移>目标, Trico旋转命中不靠落点. 这类场景求解器落点模型失效.
}
