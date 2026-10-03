// 彻底搞清楚: wa=338 右攻, 到底是什么风. 用向量, 不凭感觉.
// 坐标系定义(从代码 getEffectiveWindAngle 注释):
//   x轴 = 射击方向(射手→目标). 右攻时x轴指向右(世界+x)
//   右攻: effWa = wa (不转换)
//   xA = cos(wa)*force/mass,  xA>0 = 顺风(往目标推), xA<0 = 逆风
//   wy_acc = sin(wa)*force/mass, wy_acc>0 = 上风(抬球), wy_acc<0 = 下风(压球)

const cases = [
  ['wa=338 (图片场景)', 338],
  ['wa=0  (纯顺风)', 0],
  ['wa=90 (纯上风)', 90],
  ['wa=180(纯逆风)', 180],
  ['wa=270(纯下风)', 270],
  ['wa=336', 336],
  ['wa=350', 350],
];
const toRad = d => d*Math.PI/180;
console.log('wa    cos   sin   | 水平分量  垂直分量  | 风类判断');
for(const [lbl,wa] of cases){
  const c=Math.cos(toRad(wa)), s=Math.sin(toRad(wa));
  const h = c>0.1?'顺风→':c<-0.1?'逆风←':'近0';
  const v = s>0.1?'上风↑':s<-0.1?'下风↓':'近0';
  console.log(`${lbl.padEnd(16)} ${c.toFixed(3).padStart(6)} ${s.toFixed(3).padStart(6)} | ${h.padEnd(6)} ${v}`);
}
console.log('');
console.log('=== wa=338 的真相 ===');
console.log('cos(338°) = +0.927  => 水平分量正 => 顺风(往目标推)');
console.log('sin(338°) = -0.376  => 垂直分量负 => 下风(把球压低)');
console.log('所以 wa=338 = 顺风 + 下风 的斜风.');
console.log('');
console.log('我之前说"下风为主"是错的! cos=0.927 > |sin|=0.376, 水平顺风分量更大.');
console.log('顺风占主导, 下风次要.');
