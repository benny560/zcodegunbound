// 聚焦: 偏差是否随 ws 增大而系统化? 是否随角度偏离基础角增大而增大?
const fs = require('fs');
const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const G=0.608, DT=0.0015;
function sim(power, ang, wa, ws) {
  const mass=85-ws*ws*0.005, war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/mass, effGrav=G-Math.sin(war)*ws/mass;
  let vx=power*Math.cos(ang*Math.PI/180),vy=power*Math.sin(ang*Math.PI/180),x=0,y=0,t=0;
  for(let i=0;i<100000;i++){vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;if(y<0&&t>DT)break;if(t>16)break;}
  return x/0.4; // sd
}

// 81_上: 按 ws 分组, 看每个ws的平均偏差和角度偏离量
console.log('=== 81_上 各ws 偏差统计 (基础81°, 角度模式) ===');
console.log('ws  平均偏差   平均角度偏离  最大偏差   点数');
const byWs = {};
for (const e of table.matrices['81_上'].entries) {
  if (e.mode!=='angle') continue;
  if (!byWs[e.ws]) byWs[e.ws]=[];
  const calc = sim(3.967, e.angle, e.wa, e.ws);
  byWs[e.ws].push({err: calc-20, dAng: e.angle-81, wa:e.wa});
}
for (const ws of Object.keys(byWs).sort((a,b)=>+a-+b)) {
  const arr = byWs[ws];
  const avgErr = arr.reduce((a,b)=>a+b.err,0)/arr.length;
  const avgDAng = arr.reduce((a,b)=>a+b.dAng,0)/arr.length;
  const maxErr = Math.max(...arr.map(x=>Math.abs(x.err)));
  console.log(`${ws.padStart(2)}  ${avgErr>=0?'+':''}${avgErr.toFixed(3)}    ${avgDAng>=0?'+':''}${avgDAng.toFixed(2)}      ${maxErr.toFixed(3)}    ${arr.length}`);
}

// 关键检验: 同一ws内, 偏差是否和角度偏离正相关?
console.log('\n=== ws=10 内, 角度偏离 vs 落点偏差 (看是否相关) ===');
console.log('wa   表角度  偏离81  落点偏差');
for (const e of table.matrices['81_上'].entries) {
  if (e.mode!=='angle' || e.ws!==10) continue;
  const calc = sim(3.967, e.angle, e.wa, 10);
  console.log(`${String(e.wa).padStart(3)}  ${e.angle}   ${('+'+(e.angle-81)).padStart(5)}   ${(calc-20>=0?'+':'')+(calc-20).toFixed(3)}`);
}

// 假设: Excel 大风时力度有微调. 测试: 如果给力度+0.X, 偏差是否消失?
console.log('\n=== 力度补偿测试: 81_上 ws=10 各wa, 找使落点=20sd的力度 ===');
console.log('wa   表角度  所需力度  偏离基础3.967');
for (const e of table.matrices['81_上'].entries) {
  if (e.mode!=='angle' || e.ws!==10) continue;
  // 二分找力度
  let lo=2,hi=5;
  for(let it=0;it<50;it++){const mid=(lo+hi)/2; const x=sim(mid,e.angle,e.wa,10); if(x<20)lo=mid;else hi=mid;}
  const needP=(lo+hi)/2;
  console.log(`${String(e.wa).padStart(3)}  ${e.angle}   ${needP.toFixed(3)}    ${('+'+(needP-3.967)).padStart(6)}`);
}
