// 方向B v3: 正确的三方程自洽系统
//
// 3个未知数: V, T, angle. 3个方程:
// (1) 旋转: ω(V)·T = rotPi·π
// (2) 垂直: V·sinA = 0.5·effGrav·T  (平地落地, elev=0: vy·T=0.5·g·T² => vy=0.5·g·T)
// (3) ??? 需要第三个方程定解.
//
// 问题: 只有2个方程(旋转+垂直), 3个未知数. 欠定!
// 第三个约束是什么?
//   - 旧法用 xLand=xDist (水平落点=目标) => 但Trico球飞过目标, 不成立
//   - 旋转相位约束给出的是 ω·T=rotPi·π, 已经用了
//   - 垂直给出 sinA=0.5·eg·T/V
// 还缺一个. 
//
// 关键洞察: rotPi(sd)本身就是从【实测angle/power】反推的!
// rotPi = ω(V)·T/π, 其中V=power/PF, T=2·vy/eg.
// 所以rotPi已经隐含了angle和power的关系.
// 给定sd, rotPi(sd)是固定的 => 给定一个angle, power和T都被定了.
//
// 正确解法: angle是自由变量(由玩家选), power和T由旋转约束+垂直约束联立解.
// 但计算器要算的是: 给定sd和风, 求angle和power. 
//   这需要rotPi(sd)提供angle->power的映射.
//
// 实际上, TRICO_PHASE_FORMULAS 2.4的迭代是对的:
//   给定sd, rotPi(sd)固定. 迭代T, 每步:
//     tanA = 0.5·g·T²/dist => angle (用dist=xDist)
//     V = dist/(cosA·T) => power
//     T_new = rotPi·π/ω(V)
// 这个迭代里dist=xDist是【识别表的距离单位】, 不是物理落点!
// 即: tanA公式里的dist是"识别距离对应的像素", 是用来从T算angle的换算系数.
// 它不是"球必须落在这". 球的实际落点xLand可以≠xDist.
//
// 那为什么算出的angle偏高? 因为tanA=0.5·g·T²/xDist假设了
// "如果球飞T秒落在xDist处, 需要的角度". 但实际球飞T秒落点≠xDist.
// 不过这个公式给出的是"标准抛物线对应的角度", 和实测的偏差来自...
//
// 让我直接验证: TRICO_PHASE_FORMULAS 2.4的无风算法, 对无风识别表是否100%准.
const G=430,PF=0.004332712;
const omegaRight = V => 0.023623 * Math.pow(V, 0.764315);
// right N3 rotPi
const rotPiN3 = sd => 5.4193 - 0.01912*sd + 0.0002769*sd*sd;
// 无风N3识别表(从代码tbl.right.3取几个点)
const table=[
  {sd:5,ang:85,pow:3.0},{sd:10,ang:83,pow:3.78},{sd:20,ang:76,pow:3.76},{sd:30,ang:69,pow:3.78},{sd:40,ang:59,pow:3.98}
];
console.log('=== 无风N3: TRICO_PHASE_FORMULAS 2.4算法 vs 识别表 ===');
console.log('sd | 表angle/power | 算法angle/power | err');
for(const t of table){
  const sd=t.sd, xDist=sd*40, rotPi=rotPiN3(sd);
  let T=3.0;
  for(let i=0;i<100;i++){
    const tanA=0.5*G*T*T/xDist;
    const ang=Math.atan(tanA)*180/Math.PI;
    const V=xDist/(Math.cos(ang*Math.PI/180)*T);
    const om=omegaRight(V);
    const Tn=rotPi*Math.PI/om;
    if(Math.abs(Tn-T)<1e-4)break;
    T=0.5*(T+Tn);
  }
  const tanA=0.5*G*T*T/xDist;
  const ang=Math.atan(tanA)*180/Math.PI;
  const V=xDist/(Math.cos(ang*Math.PI/180)*T);
  const power=V*PF;
  console.log(`${String(sd).padStart(3)} | ${t.ang}/${t.pow} | ${ang.toFixed(2)}/${power.toFixed(3)} | ${(ang-t.ang).toFixed(2)}°/${(power-t.pow).toFixed(3)}`);
}
console.log('');
console.log('如果无风N3准, 说明算法和rotPi对, 有风时的偏差来自风处理.');
console.log('如果无风N3也偏, 说明算法或rotPi有问题.');
