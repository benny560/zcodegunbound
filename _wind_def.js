// 用实测数据反推 windAngle 的定义.
// 关键证据: 找一个风向明确、实测明确的样本, 看 angle 怎么变.
// 
// 思路: 右攻, 无风时 N3 角度≈88(近垂直, 高抛). 
//   如果 wa=0 是"顺风(往目标推)": 球被推远, 要打近目标得更高抛, angle↑
//   如果 wa=0 是"逆风(往回推)": 球被推回, 可以低抛, angle↓
// 看实测右攻 wa 接近0 的样本 angle 是升还是降.
const data=JSON.parse(require('fs').readFileSync('_real_v1.json','utf8'));
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
console.log('=== 右攻N3: angle vs effWa 关系 ===');
console.log('(无风N3 sd=20 angle≈76, 看风怎么改变angle)');
const r3=data.filter(d=>d.n===3&&d.side==='右'&&d.distance>=0).sort((a,b)=>effWa('右',a.windAngle)-effWa('右',b.windAngle));
console.log('sd    effWa ws | angle  power  | 风的水平符号(cos)  推断风向');
for(const d of r3){
  const wa=effWa('右',d.windAngle);
  const c=Math.cos(wa*Math.PI/180);
  const dir = c>0.3?'顺风→':c<-0.3?'逆风←':'侧风';
  console.log(`${String(d.distance).padStart(5)} ${String(wa).padStart(5)} ${String(d.windStrength).padStart(2)} | ${String(d.angle).padStart(3)}  ${d.power.toFixed(2)}  | cos=${c.toFixed(2).padStart(6)} ${dir}`);
}
console.log('');
// 另一个铁证: 图片场景 wa=338 实测89.3度(极高抛).
// 顺风(球被推远)打近距离才需要89度高抛. 如果wa=338是逆风, 89度高抛说不通(逆风球飞不远, 近距离低抛即可).
console.log('=== 铁证 ===');
console.log('图片场景 wa=338 sd=20 实测89.3度(接近垂直的高抛).');
console.log('只有顺风(风把球往目标推)才需要89度高抛打20距离 —— ');
console.log('  顺风+近距离 => 必须高抛减小vx, 否则球飞过目标.');
console.log('所以 wa=338(cos=+0.93) 是顺风, 定义正确: cos>0=顺风.');
console.log('3个NULL(wa=0/10, cos>0)确实是顺风大风.');
