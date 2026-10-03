// 从开炮表反推真实物理常数 (g, 风力系数)
// 思路: 开炮表给 (角度,力度,wa,ws)→命中20sd。
//   用这些约束反推 g 和风力的有效系数。
//
// 无风时: Vo²·sin(2a)/g = 8 (已验证 g=0.608)
// 有风时: 闭式解不再简单, 但可以用数值积分 + 拟合
//
// 假设模型: xA = kx·cos(wa)·ws/mass, effGrav = g - ky·sin(wa)·ws/mass
//   无风已确定 g=0.608。拟合 kx, ky (理论都=1)
// 用 81_上 的小风点(ws=1,2) 反推, 这些点偏差小, 最接近真实物理
//
// 方法: 对 ws=1 的各 wa, 表给角度A, 力度=3.967, 命中20sd
//   固定 g=0.608, mass=85, 找 (kx,ky) 使数值落点=8
// 多个wa点最小二乘

const fs = require('fs');
const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));

function sim(kx, ky, power, ang, wa, ws, g=0.608) {
  const DT=0.0015, mass=85-ws*ws*0.005, war=wa*Math.PI/180;
  const xA = kx*Math.cos(war)*ws/mass, effGrav = g - ky*Math.sin(war)*ws/mass;
  const Vo=power, rad=ang*Math.PI/180;
  let vx=Vo*Math.cos(rad), vy=Vo*Math.sin(rad), x=0, y=0, t=0;
  for(let i=0;i<100000;i++){
    vx+=xA*DT; vy-=effGrav*DT; x+=vx*DT; y+=vy*DT; t+=DT;
    if(y<0&&t>DT)break; if(t>16)break;
  }
  return x;
}

// 取 81_上 ws=1,2,3 所有角度模式点
const pts = [];
for (const e of table.matrices['81_上'].entries) {
  if (e.mode==='angle' && e.ws<=3) pts.push({ws:e.ws, wa:e.wa, ang:e.angle, p:3.967});
}
console.log(`用 ${pts.length} 个 81_上 小风点 反推 kx,ky (理论=1,1)`);

// 网格搜索 kx, ky 在 0.5-1.5
let best={err:Infinity};
for (let kx=0.7; kx<=1.3; kx+=0.02) {
  for (let ky=0.7; ky<=1.3; ky+=0.02) {
    let sumErr=0;
    for (const p of pts) {
      const x = sim(kx,ky,p.p,p.ang,p.wa,p.ws);
      sumErr += (x-8)*(x-8);
    }
    if (sumErr < best.err) best = {kx,ky,err:sumErr};
  }
}
console.log(`最优: kx=${best.kx.toFixed(3)} ky=${best.ky.toFixed(3)} SSE=${best.err.toFixed(4)}`);

// 也试试: 是不是 g 不对? 或者 mass 公式不对?
// 另一种可能: 风力不是 ws, 而是 ws-1 或别的 (像Trico的lookupWind)
// 或者: 质量不是 85-w²·0.005, 而是常数85, 或别的

// 测试几种假设
console.log('\n=== 假设对比 (用81_上 ws=1-5 全角度点, 落点MAE) ===');
const testPts = [];
for (const e of table.matrices['81_上'].entries) {
  if (e.mode==='angle' && e.ws<=5) testPts.push({ws:e.ws, wa:e.wa, ang:e.angle, p:3.967});
}

const hypotheses = [
  {name:'标准 kx=1 ky=1 g=0.608 mass=85-w²·0.005', kx:1, ky:1, g:0.608, massFn:(ws)=>85-ws*ws*0.005},
  {name:'kx=1 ky=1 g=0.608 mass=常数85', kx:1, ky:1, g:0.608, massFn:(ws)=>85},
  {name:'反推kx ky', kx:best.kx, ky:best.ky, g:0.608, massFn:(ws)=>85-ws*ws*0.005},
];

for (const h of hypotheses) {
  let sumErr=0, cnt=0;
  for (const p of testPts) {
    const DT=0.0015, mass=h.massFn(p.ws), war=p.wa*Math.PI/180;
    const xA=h.kx*Math.cos(war)*p.ws/mass, effGrav=h.g-h.ky*Math.sin(war)*p.ws/mass;
    let vx=p.p*Math.cos(p.ang*Math.PI/180),vy=p.p*Math.sin(p.ang*Math.PI/180),x=0,y=0,t=0;
    for(let i=0;i<100000;i++){vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;if(y<0&&t>DT)break;if(t>16)break;}
    sumErr+=Math.abs(x/0.4-20); cnt++;
  }
  console.log(`  ${h.name}: MAE=${(sumErr/cnt).toFixed(3)}sd`);
}

// 关键诊断: 看是不是只有"上风分量大"(wa接近90)的点才偏
console.log('\n=== 按wa分组偏差 (标准模型, 81_上 ws1-5) ===');
const byWa = {};
for (const p of testPts) {
  const x = sim(1,1,p.p,p.ang,p.wa,p.ws);
  const err = x/0.4 - 20;
  if (!byWa[p.wa]) byWa[p.wa]=[];
  byWa[p.wa].push(err);
}
for (const wa of Object.keys(byWa).sort((a,b)=>+a-+b)) {
  const errs = byWa[wa];
  const avg = errs.reduce((a,b)=>a+b,0)/errs.length;
  console.log(`  wa=${wa}: 平均偏差${avg>=0?'+':''}${avg.toFixed(3)}sd (${errs.length}点)`);
}
