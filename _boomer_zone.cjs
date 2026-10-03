// 分区精度统计: ws<=10 (物理可信区) vs ws>=11 (开炮表可能换模型)
const fs = require('fs');
const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const G=0.608, DT=0.0015;
function sim(power, ang, wa, ws, elev=0) {
  const mass=85-ws*ws*0.005, war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/mass, effGrav=G-Math.sin(war)*ws/mass;
  let vx=power*Math.cos(ang*Math.PI/180),vy=power*Math.sin(ang*Math.PI/180),x=0,y=elev,t=0;
  for(let i=0;i<100000;i++){vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;if(y<0&&t>DT)break;if(t>16)break;}
  return x/0.4;
}
function simPow(p, ang, wa, ws, elev=0) { return sim(p,ang,wa,ws,elev); }

const matrixMeta = {
  '81_上': {basePow:3.967}, '81_下': {basePow:3.967},
  '70_上': {basePow:2.751}, '70_下': {basePow:2.751},
  '50_上': {basePow:2.222}, '50_下': {basePow:2.222},
};

// 分区: ws<=10 vs ws>=11, 角度模式(用表角度正向算落点) vs 减力模式(90°+表力度)
console.log('=== 分区精度统计 (正向: 表参数→落点, 目标20sd) ===\n');

function zoneStats(maxWs) {
  let all = [], angleCnt=0, powerCnt=0;
  for (const mkey of Object.keys(matrixMeta)) {
    const meta = matrixMeta[mkey];
    for (const e of table.matrices[mkey].entries) {
      if (e.ws > maxWs[1] || e.ws < maxWs[0]) continue;
      if (e.mode === 'angle' && e.angle > 0 && e.angle < 90) {
        const land = sim(meta.basePow, e.angle, e.wa, e.ws);
        all.push(Math.abs(land-20)); angleCnt++;
      } else if (e.mode === 'power') {
        const p = meta.basePow + e.dpower;
        const land = sim(p, 90, e.wa, e.ws);
        all.push(Math.abs(land-20)); powerCnt++;
      }
    }
  }
  const mae = all.reduce((a,b)=>a+b,0)/all.length;
  const max = Math.max(...all);
  const hit02 = all.filter(x=>x<0.2).length;
  const hit05 = all.filter(x=>x<0.5).length;
  const hit1 = all.filter(x=>x<1.0).length;
  return {n:all.length, mae, max, hit02, hit05, hit1, angleCnt, powerCnt};
}

for (const [name, zone] of [['ws 1-10 (可信区)', [1,10]], ['ws 11-26 (强风区)', [11,26]], ['ws 1-26 (全部)', [1,26]]]) {
  const s = zoneStats(zone);
  console.log(`[${name}] ${s.n}点 (角度${s.angleCnt}+减力${s.powerCnt})`);
  console.log(`  落点MAE=${s.mae.toFixed(4)}sd 最大=${s.max.toFixed(3)}sd`);
  console.log(`  <0.2sd(8px): ${(100*s.hit02/s.n).toFixed(2)}% | <0.5sd(20px): ${(100*s.hit05/s.n).toFixed(2)}% | <1sd(40px): ${(100*s.hit1/s.n).toFixed(2)}%`);
}

// 更细: ws 1-10 内, 哪些点超0.2sd?
console.log('\n=== ws<=10 内 |偏差|>0.2sd 的点 ===');
let badCnt=0;
for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  for (const e of table.matrices[mkey].entries) {
    if (e.ws > 10) continue;
    let land;
    if (e.mode === 'angle' && e.angle > 0 && e.angle < 90) land = sim(meta.basePow, e.angle, e.wa, e.ws);
    else if (e.mode === 'power') land = sim(meta.basePow + e.dpower, 90, e.wa, e.ws);
    else continue;
    const err = land - 20;
    if (Math.abs(err) > 0.2) { badCnt++; if(badCnt<=20) console.log(`  ${mkey} ws=${e.ws} wa=${e.wa}: 偏差${err>=0?'+':''}${err.toFixed(3)}sd`); }
  }
}
console.log(`  共 ${badCnt} 个点超0.2sd`);

// 关键: ws<=10 且 非回旋区(角度<88) 的精度
console.log('\n=== ws<=10 且 角度<88° (纯物理可信核心区) ===');
let core=[], coreCnt=0;
for (const mkey of Object.keys(matrixMeta)) {
  const meta = matrixMeta[mkey];
  for (const e of table.matrices[mkey].entries) {
    if (e.ws > 10) continue;
    if (e.mode==='angle' && e.angle>=88) continue; // 排除近垂直
    if (e.mode==='power') continue; // 排除90°减力
    if (e.mode==='angle' && e.angle>0 && e.angle<88) {
      const land = sim(meta.basePow, e.angle, e.wa, e.ws);
      core.push(Math.abs(land-20)); coreCnt++;
    }
  }
}
const cmae = core.reduce((a,b)=>a+b,0)/core.length;
const cmax = Math.max(...core);
const chit02 = core.filter(x=>x<0.2).length;
console.log(`  ${coreCnt}点, MAE=${cmae.toFixed(4)}sd 最大=${cmax.toFixed(3)}sd, <0.2sd命中率${(100*chit02/coreCnt).toFixed(2)}%`);
