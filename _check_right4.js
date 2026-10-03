// right:4 只有2个样本, 看当前系数和这2样本的关系, 评估是否需要改
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
console.log('=== right:4 全部样本 ===');
const subs=[];
for(const d of data){
  if(d.n!==4||d.side!=='右'||d.distance<0)continue;
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const wya=Math.sin(r)*f/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0)continue;
  const Tt=(vy+Math.sqrt(dc))/eg;
  subs.push({sd:d.distance,ws:d.windStrength,wa,Tt,elev:d.elevation,angle:d.angle,power:d.power});
}
// 当前系数 5.1551-0.00594·sd
const cur={a:5.1551,b:-0.00594};
console.log('sd     ws wa  | T_true  T_base当前  diff');
for(const s of subs){
  const Tb=cur.a+cur.b*s.sd;
  console.log(`${String(s.sd).padStart(6)} ${String(s.ws).padStart(2)} ${String(s.wa).padStart(3)} | ${s.Tt.toFixed(3)}  ${Tb.toFixed(3)}  ${(s.Tt-Tb>=0?'+':'')+(s.Tt-Tb).toFixed(3)}`);
}
console.log(`\n当前系数: ${cur.a}+(${cur.b})·sd`);
console.log('right:4 只有2个样本, 无法可靠拟合(2点必然过拟合). 当前MAE看着行但无统计意义.');
console.log('');
// 关键: 这2样本的diff方向
const diffs=subs.map(s=>s.Tt-(cur.a+cur.b*s.sd));
console.log('diff方向:', diffs);
console.log('sd=9.5 diff='+diffs[0].toFixed(3)+' (近距, 模型偏低)');
console.log('sd=37.13 diff='+diffs[1].toFixed(3)+' (远距, 模型准)');
console.log('');
// 看right:4在中等距离(sd=15-30)有没有数据缺口
console.log('right:4 数据缺口: sd=9.5 和 sd=37.13 之间完全空白(15-35无数据)');
console.log('=> right:4 当前系数无法验证, 不宜改动(会过拟合2个点)');
