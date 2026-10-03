// 假设 dT 新增水平风项. 物理推导:
// 水平位移 x = vx*T + 0.5*xA*T^2. 顺风(xA>0)时, 要打到同一目标, 要么缩T要么降vx.
// 但T由旋转约束(转N圈)定, 不能随便缩. 真正的物理是: 给定T, 顺风让vx更小(角度更高).
// 所以这俩NULL样本的问题不是T该缩, 而是T=3.45时, 即使vx=0, 0.5*xA*T^2=634 > 目标120,
// 球的水平位移下限就是634, 根本打不到120.
// => 这说明 T=3.45 对"左3 sd=3 近顺风ws26"这个场景本身就太大了.
// 实测 T_true=3.369, 0.5*xA*T_true^2 = 0.5*106*3.369^2 = 602, 仍 > 120.
// 所以即使T降到实测值, 经典落点约束denom仍<0. 球的水平位移永远>目标.
// 结论: 这2个样本, 经典抛物线落点模型从根本上失效. Trico靠旋转命中, 不是落点命中.
//
// 那版本A的cap怎么救出来的? cap把T砍到 sqrt(2*xDist/xA)*0.92:
const sd1=3, xA1=106.32, xDist1=120;
const Tcap1=Math.sqrt(2*xDist1/xA1)*0.92;
console.log(`样本1: T_cap=${Tcap1.toFixed(4)} (从3.45砍到这), denom此时=${(xDist1-0.5*xA1*Tcap1*Tcap1).toFixed(2)}`);
const G1=430,MASS=0.23;const sinW1=Math.sin(12*Math.PI/180);const force1=25;
const effGrav1=G1-sinW1*force1/MASS;
const tanA1=(0+0.5*effGrav1*Tcap1*Tcap1)/(xDist1-0.5*xA1*Tcap1*Tcap1);
console.log(`  angleRaw=${(Math.atan(tanA1)*180/Math.PI).toFixed(2)} (版本A的87度)`);
console.log(`  但实测72度, T_true=3.369. cap硬解87度是错的.`);
console.log('');
console.log('=== 关键认知 ===');
console.log('这2个样本(left近顺风小距离ws25+), Trico的球飞3.4s, 水平位移下限634px远超目标120px.');
console.log('经典抛物线"落点=目标"约束从物理上就不可能满足.');
console.log('实测能打中, 是因为Trico三球旋转: 球的质心飞到远处, 但三球靠旋转在某个相位聚拢命中.');
console.log('=> 落地时间求解器的"落点约束"对这类场景根本不适用.');
console.log('   cap是把T砍到落点能凑合的假解(87度错), 删cap是暴露真相(NULL).');
console.log('   两者都不对. 正确做法: 这类场景应该走旋转命中模型, 不该用落点求解器.');
