// 重新审视3个NULL. 我说"90度垂直射风也能吹过目标" => 无解.
// 但这个推理有漏洞: T 不是固定的! T = T_base + dT, 当角度变高、vx变小时,
// 实际飞行轨迹完全不同. 而且 Trico 的 T 由旋转约束定, 不该用落点 T.
// 
// 关键: 版本A的cap能出解(87.x), 说明这个场景【有解】, 只是cap的T砍错了.
// 版本A: sd=15 wa=0 ws=26 -> 87.4/2.85 (cap把T砍到1.46)
// 问题: cap砍的T太狠, 但方向可能对(顺风要缩短T).
//
// 让我算: 这3个场景, 要让denom>0, T最大能是多少?
const G=430,MASS=0.23,PF=0.004332712;
const cases=[
  ['右3 sd=15 wa=0 ws=26', 15, 0, 26],
  ['右3 sd=10 wa=0 ws=24', 10, 0, 24],
  ['右3 sd=18 wa=10 ws=24',18, 10, 24],
];
for(const [lbl,dist,wa,ws] of cases){
  const wr=wa*Math.PI/180,cosW=Math.cos(wr);
  const force=Math.max(0,ws-1);
  const xA=cosW*force/MASS;
  const xDist=dist*40;
  const T_max=Math.sqrt(2*xDist/xA); // denom=0的临界T
  const T_base=4.1243-0.01039*dist;
  console.log(`${lbl}:`);
  console.log(`  T_base+dT = ${T_base.toFixed(3)}  T_max(denom=0) = ${T_max.toFixed(3)}  比值=${(T_base/T_max).toFixed(2)}`);
  // 版本A cap = T_max*0.92
  console.log(`  版本A cap(T_max*0.92) = ${(T_max*0.92).toFixed(3)}  -> 砍掉 ${(T_base-T_max*0.92).toFixed(3)}`);
  // 物理上: 顺风球更快到达, T确实该缩短. 缩到多少?
  // 如果用旋转约束: N3需要 omega*T/(2pi) = 3. 但omega依赖V(力度), 循环依赖.
}
console.log('\n=== 重新认识 ===');
console.log('这3个场景 T_base+dT > T_max, 即模型T让球飞太远.');
console.log('版本A的cap砍T方向对(顺风缩短T), 但0.92系数是拍脑袋, 砍太多.');
console.log('正确做法: 不是删cap让NULL, 也不是0.92硬砍.');
console.log('而是: 顺风时T确实该缩短, 用物理推导算该缩短多少, 而不是拍0.92.');
