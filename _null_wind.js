// 3个NULL场景, 用向量分解确认风向. 绝不凭感觉.
// 这3个是: 右3 sd=15 wa=0 ws=26, 右3 sd=10 wa=0 ws=24, 右3 sd=18 wa=10 ws=24
// 右攻: effWa = wa (不转换)
//   xA = cos(wa)*force/mass
//   xA>0 => 顺风(往目标推), xA<0 => 逆风
const MASS=0.23;
const cases=[
  ['右3 sd=15 wa=0  ws=26', 0,  26],
  ['右3 sd=10 wa=0  ws=24', 0,  24],
  ['右3 sd=18 wa=10 ws=24', 10, 24],
];
console.log('=== 3个NULL场景 风向向量分解 ===');
for(const [lbl,wa,ws] of cases){
  const force=Math.max(0,ws-1);
  const wr=wa*Math.PI/180;
  const cosW=Math.cos(wr), sinW=Math.sin(wr);
  const xA=cosW*force/MASS;
  const wy_acc=sinW*force/MASS;
  const dir = xA>0?'顺风(往目标推)':'逆风(往回推)';
  const vdir = wy_acc>0?'上风':'下风';
  console.log(`${lbl}:`);
  console.log(`  cos(${wa}°)=${cosW.toFixed(3)}  xA=${xA.toFixed(1)} => ${dir}`);
  console.log(`  sin(${wa}°)=${sinW.toFixed(3)}  wy_acc=${wy_acc.toFixed(1)} => ${vdir}`);
}
console.log('\n=== 结论 ===');
console.log('wa=0:  cos=+1.0, xA>0 => 顺风!');
console.log('wa=10: cos=+0.98, xA>0 => 顺风!');
console.log('3个NULL全是顺风大风. 不是逆风.');
console.log('');
console.log('但! 这里有个致命问题要确认:');
console.log('windAngle=0 在这个游戏/计算器里到底代表什么方向?');
console.log('是"风往0度方向吹"还是"从0度方向吹来"?');
console.log('如果定义反了, wa=0 可能其实是逆风!');
