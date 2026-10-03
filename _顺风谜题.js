// 顺风场景实测数据有矛盾, 找出来
const data=JSON.parse(require('fs').readFileSync('_real_v1.json','utf8'));
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
console.log('=== 右攻顺风(cos>0)的N3样本 ===');
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
console.log('sd    effWa ws | angle power | xA    球被风吹的水平位移(0.5*xA*T²)');
for(const d of data.filter(x=>x.n===3&&x.side==='右'&&x.distance>=0)){
  const wa=effWa('右',d.windAngle);
  const c=Math.cos(wa*Math.PI/180);
  if(c<=0)continue; // 只看顺风
  const force=Math.max(0,d.windStrength-1);
  const xa=c*force/MASS;
  // 反推T
  const wya=Math.sin(wa*Math.PI/180)*force/MASS,eg=G-wya;
  const V=d.power/PF,vy=V*Math.sin(d.angle*Math.PI/180);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0){console.log(`${String(d.distance).padStart(5)} ${String(wa).padStart(5)} ${String(d.windStrength).padStart(2)} | ${d.angle} ${d.power.toFixed(2)} | T反推失败`);continue;}
  const T=(vy+Math.sqrt(dc))/eg;
  const windDrift=0.5*xa*T*T;
  const xDist=d.distance*40;
  console.log(`${String(d.distance).padStart(5)} ${String(wa).padStart(5)} ${String(d.windStrength).padStart(2)} | ${String(d.angle).padStart(3)} ${d.power.toFixed(2)} | ${xa.toFixed(0).padStart(4)}  drift=${windDrift.toFixed(0)}(目标${xDist})`);
}
console.log('');
console.log('谜题: 顺风样本实测都能打中. 但那3个NULL(sd=10/15/18 wa=0/10 ws=24/26)');
console.log('  没有实测数据覆盖! 它们是我虚构的测试场景.');
console.log('  也许游戏里这些场景【根本不需要N3】, 或者打不出N3, 所以没实测.');
