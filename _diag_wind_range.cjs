// 诊断"部分风向偏短": 把实测真实angle/power丢进模型风物理, 看落点vs目标.
// xLand_real > 目标 => 模型算得太远 => 求解时给偏弱解 => 游戏偏短.
// 按风向(相对射击方向的 顺/逆 + 上/下)分组找问题范围. 用法: node _diag_wind_range.cjs
const fs = require('fs');
const PF = 0.004332712, MASS = 0.23, G = 430, EPPU = 516/13, sdParts = 20;
const data = JSON.parse(fs.readFileSync('_real_v1.json','utf8'));

function analyze(d){
  const dir = d.side === '右' ? 'right' : 'left';
  // effective wind angle (左射翻转水平分量)
  const wa = dir === 'left' ? ((180 - d.windAngle) % 360 + 360) % 360 : d.windAngle;
  const wr = wa * Math.PI/180, cosW = Math.cos(wr), sinW = Math.sin(wr);
  const ws = d.windStrength || 0;
  const force = ws === 0 ? 0 : (Math.abs(cosW+1) < 0.001 ? ws : Math.max(0, ws-1));
  const xA = cosW * force / MASS;
  const effGrav = G - sinW * force / MASS;
  const xDist = Math.abs(d.distance) * (800/sdParts);
  const elevInternal = (d.elevation || 0) * EPPU;
  // 真实解的运动学
  const V = d.power / PF;
  const aR = d.angle * Math.PI/180;
  const vx = V*Math.cos(aR), vy = V*Math.sin(aR);
  // 解落地时间: 0.5*effGrav*T^2 - vy*T + elev = 0, 取较大根(下降段)
  const disc = vy*vy - 2*effGrav*elevInternal;
  if (disc < 0 || effGrav <= 0) return null;
  const T = (vy + Math.sqrt(disc)) / effGrav;
  const xLand = vx*T + 0.5*xA*T*T;
  const errSD = (xLand - xDist)/40;   // >0: 真实解飞过目标(模型算太远)=>求解偏短
  return { dir, wa, cosW, sinW, ws, errSD, headwind: cosW < -0.05 ? '逆' : (cosW > 0.05 ? '顺' : '平'), vert: sinW > 0.05 ? '上' : (sinW < -0.05 ? '下' : '平') };
}

const rows = [];
for (const d of data){
  const a = analyze(d);
  if (!a) continue;
  rows.push({ dist:d.distance, elev:d.elevation, wa0:d.windAngle, effWa:a.wa, ws:a.ws, side:d.side, n:d.n, ...a });
}

// 只看右射(right), 按 effWa 排序
const right = rows.filter(r=>r.dir==='right' && r.dist>0);
right.sort((x,y)=>x.effWa - y.effWa);
console.log('=== 右射(right) 实测: 真实解在模型风物理下的落点误差 (>0=飞过目标=>求解偏短) ===');
console.log('effWa 顺逆 上下 | ws | dist  elev  n | 落点误差SD');
for (const r of right){
  console.log(`${String(r.effWa).padStart(4)}  ${r.headwind}   ${r.vert}  | ${String(r.ws).padStart(2)} | ${String(r.dist).padStart(5)} ${String(r.elev).padStart(5)} ${r.n} | ${(r.errSD>=0?'+':'')+r.errSD.toFixed(2)}`);
}

// 分组统计: 顺风 vs 逆风
function grp(name, arr){
  if (!arr.length) return;
  const mean = arr.reduce((s,r)=>s+r.errSD,0)/arr.length;
  const mae = arr.reduce((s,r)=>s+Math.abs(r.errSD),0)/arr.length;
  console.log(`  ${name.padEnd(14)} n=${String(arr.length).padStart(2)}  平均落点误差=${(mean>=0?'+':'')+mean.toFixed(2)}SD  |误差|=${mae.toFixed(2)}SD`);
}
console.log('\n=== 右射按风向分组 (平均落点误差, >0=>偏短) ===');
grp('逆风(cos<0)', right.filter(r=>r.cosW<-0.05));
grp('  逆+上风', right.filter(r=>r.cosW<-0.05 && r.sinW>0.05));
grp('  逆+下风', right.filter(r=>r.cosW<-0.05 && r.sinW<-0.05));
grp('顺风(cos>0)', right.filter(r=>r.cosW>0.05));
grp('  顺+上风', right.filter(r=>r.cosW>0.05 && r.sinW>0.05));
grp('  顺+下风', right.filter(r=>r.cosW>0.05 && r.sinW<-0.05));
