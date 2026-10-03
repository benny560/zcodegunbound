// 三个样本射击坐标系里风几乎一样, 但右攻对、左攻NULL.
// 关键: calcTimePhysicsSolver 里 windAngle 直接传入, 不做左右转换!
// 第1行: 右3 wa=170, solver用wa=170 (cos170=-0.985 -> xA<0 逆风, denom增大, 没问题)
// NULL1:  左3 wa=12, solver用wa=12 (cos12=+0.978 -> xA>0 顺风!, denom缩小, 爆炸)
// 但实际左攻wa=12等价于右攻wa=168, 是逆风! solver没用转换后的角度, 直接拿wa=12算 -> 误判成顺风
const G=430,MASS=0.23;
function solverPhys(wa, ws){
  const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=Math.max(0,ws-1);
  const xA=cosW*force/MASS;
  return {xA:+xA.toFixed(2), cosW:+cosW.toFixed(3), eff_sinW:+sinW.toFixed(3)};
}
console.log('=== solver实际收到的windAngle 和算出的xA ===');
console.log('第1行 右3 wa=170: solver收到wa=170 ->', solverPhys(170,24));
console.log('NULL1  左3 wa=12 : solver收到wa=12  ->', solverPhys(12,26));
console.log('NULL2  左3 wa=18 : solver收到wa=18  ->', solverPhys(18,25));
console.log('');
console.log('=== 如果左攻先转换windAngle(180-wa), solver会收到什么 ===');
console.log('NULL1 左3 wa=12 -> 转换后wa=168:', solverPhys(168,26));
console.log('NULL2 左3 wa=18 -> 转换后wa=162:', solverPhys(162,25));
console.log('');
console.log('=== 根因 ===');
console.log('左攻wa=12物理上等价于右攻wa=168(逆风). 但calcTimePhysicsSolver收到原始wa=12,');
console.log('cos(12)=+0.978, 误判成水平顺风(xA>0), 导致denom=xDist-0.5*xA*T^2 爆炸.');
console.log('右攻wa=170的cos(170)=-0.985, 正确判为逆风, denom健康.');
console.log('');
console.log('问题: calcTimePhysicsSolver 的入参 windAngle 是射击坐标系还是绝对风向?');
console.log('searchTrico3in1Physics -> calcWithWind -> calcTimePhysicsSolver, 看调用链有没有转换.');
