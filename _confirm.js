// 确认: _check_Tbase.js 没做风向转换导致左攻T_true算错
// 用正确的effWa重算左3样本的T_true
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const data=require('fs').readFileSync('_real_v1.json','utf8');
// 左3 sd=3 wa=12 ws=26 实测72/3.1
const d={distance:3,windAngle:12,windStrength:26,elevation:-0.5,angle:72,power:3.1,side:'左'};
const wa=effWa(d.side,d.windAngle); // 168
const r=wa*Math.PI/180;
const f=Math.max(0,d.windStrength-1);
const wya=Math.sin(r)*f/MASS,eg=G-wya;
const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
const dc=vy*vy-2*eg*d.elevation*EP;
const Tt=(vy+Math.sqrt(dc))/eg;
const Tb=4.1243-0.01039*d.distance; // 注意: 左攻用left:3=3.478-0.01085*sd
const TbL=3.478-0.01085*d.distance;
console.log(`左3 sd=3 wa=12->eff168 ws=26:`);
console.log(`  T_true(正确转换) = ${Tt.toFixed(3)}`);
console.log(`  T_base right:3 (错误, 不该用) = ${Tb.toFixed(3)}`);
console.log(`  T_base left:3  (正确)         = ${TbL.toFixed(3)}`);
console.log(`  diff(vs left:3) = ${(Tt-TbL).toFixed(3)}`);
console.log('');
console.log('=> _check_Tbase.js 错在: 所有N3都用right:3的T_base(4.1243-0.01039)对比,');
console.log('   但左攻实际用left:3(3.478-0.01085), 所以左攻diff显示偏高0.6是对比基准用错了.');
console.log('   实际左右各自的T_base拟合都很好(MAE~0.05).');
