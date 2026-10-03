// 研究强风区(ws≥11)偏差规律
// 假设1: 开炮表在大风用了不同物理(如 g 变化, 或风力非线性)
// 假设2: 偏差集中在特定风向(纯顺风 wa~0 还是斜风?)
// 假设3: 偏差和"角度饱和到90"有关
const fs = require('fs');
const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const G=0.608, DT=0.0015;
function sim(power, ang, wa, ws) {
  const mass=85-ws*ws*0.005, war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/mass, effGrav=G-Math.sin(war)*ws/mass;
  let vx=power*Math.cos(ang*Math.PI/180),vy=power*Math.sin(ang*Math.PI/180),x=0,y=0,t=0;
  for(let i=0;i<100000;i++){vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;if(y<0&&t>DT)break;if(t>16)break;}
  return x/0.4;
}

// 强风区偏差按 矩阵+模式 分组
console.log('=== 强风区(ws>=11)偏差分布 ===');
const matrixMeta = {
  '81_上':3.967,'81_下':3.967,'70_上':2.751,'70_下':2.751,'50_上':2.222,'50_下':2.222
};
for (const mkey of Object.keys(matrixMeta)) {
  const bp = matrixMeta[mkey];
  const angleErr=[], powerErr=[];
  for (const e of table.matrices[mkey].entries) {
    if (e.ws<11) continue;
    if (e.mode==='angle' && e.angle>0 && e.angle<90) {
      angleErr.push(sim(bp,e.angle,e.wa,e.ws)-20);
    } else if (e.mode==='power') {
      powerErr.push(sim(bp+e.dpower,90,e.wa,e.ws)-20);
    }
  }
  const aMae = angleErr.length?angleErr.reduce((a,b)=>a+Math.abs(b),0)/angleErr.length:0;
  const pMae = powerErr.length?powerErr.reduce((a,b)=>a+Math.abs(b),0)/powerErr.length:0;
  console.log(`  ${mkey}: 角度${angleErr.length}点MAE=${aMae.toFixed(2)} | 减力${powerErr.length}点MAE=${pMae.toFixed(2)}`);
}

// 关键: 强风区的偏差是不是系统性(符号一致)?
console.log('\n=== 81_上 强风区(ws>=11) 偏差符号分布 ===');
let pos=0, neg=0;
for (const e of table.matrices['81_上'].entries) {
  if (e.ws<11 || e.mode!=='angle' || e.angle<=0 || e.angle>=90) continue;
  const err = sim(3.967,e.angle,e.wa,e.ws)-20;
  if (err>0)pos++; else neg++;
}
console.log(`  正偏差(球飞远)${pos} 负偏差(球飞近)${neg}`);

// 核心假设检验: 强风区是否进入了回旋? (wentBack)
console.log('\n=== 81_上 强风区 是否回旋 ===');
const G2=0.608;
function simFull(power, ang, wa, ws) {
  const mass=85-ws*ws*0.005, war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/mass, effGrav=G2-Math.sin(war)*ws/mass;
  let vx=power*Math.cos(ang*Math.PI/180),vy=power*Math.sin(ang*Math.PI/180),x=0,y=0,t=0,prevVx=vx,back=false;
  for(let i=0;i<100000;i++){vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;
    if(vx<0&&prevVx>=0)back=true;prevVx=vx;if(y<0&&t>DT)break;if(t>16)break;}
  return {x:x/0.4, back};
}
let backCnt=0, tot=0;
for (const e of table.matrices['81_上'].entries) {
  if (e.ws<11 || e.mode!=='angle') continue;
  tot++;
  if (simFull(3.967,e.angle,e.wa,e.ws).back) backCnt++;
}
console.log(`  ${backCnt}/${tot} 点发生回旋`);

// 检查: 强风区 81_上 的wa分布 (是不是集中在某wa)
console.log('\n=== 81_上 ws=15 角度模式点 ===');
for (const e of table.matrices['81_上'].entries) {
  if (e.ws!==15 || e.mode!=='angle') continue;
  const r = simFull(3.967,e.angle,e.wa,e.ws);
  console.log(`  wa=${e.wa} 表角度${e.angle} 落点${r.x.toFixed(2)}sd(偏${(r.x-20>=0?'+':'')}${(r.x-20).toFixed(2)}) ${r.back?'[回旋]':''}`);
}

// 检查 _下矩阵(逆风)强风区是否也偏差大
console.log('\n=== 81_下(逆风) ws=15 角度模式 ===');
for (const e of table.matrices['81_下'].entries) {
  if (e.ws!==15 || e.mode!=='angle') continue;
  const r = simFull(3.967,e.angle,e.wa,e.ws);
  console.log(`  wa=${e.wa} 表角度${e.angle} 落点${r.x.toFixed(2)}sd(偏${(r.x-20>=0?'+':'')}${(r.x-20).toFixed(2)}) ${r.back?'[回旋]':''}`);
}
