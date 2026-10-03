// Boomer 开炮表 v4 逐点回算验证: 判定风向符号约定 + 检测回旋(折射)区
const fs = require('fs');
const table = JSON.parse(fs.readFileSync('_boomer_table_v4.json', 'utf-8'));
const G = 0.608;
const BASE_SD = 20;
const BASE_POWER = { 81: 3.967, 70: 2.751, 50: 2.222 };

function sim(power, angDeg, wa, ws, flipWind) {
  const mass = 85 - ws * ws * 0.005;
  const war = wa * Math.PI / 180;
  const sgn = flipWind ? -1 : 1;
  const xA = sgn * Math.cos(war) * ws / mass;
  const effGrav = G - Math.sin(war) * ws / mass;
  if (effGrav <= 0) return null;
  const DT = 0.0015;
  let vx = power * Math.cos(angDeg * Math.PI / 180), vy = power * Math.sin(angDeg * Math.PI / 180);
  let x = 0, y = 0, t = 0, wentBack = false, prevVx = vx, maxX = 0;
  for (let i = 0; i < 200000; i++) {
    vx += xA * DT; vy -= effGrav * DT; x += vx * DT; y += vy * DT; t += DT;
    if (vx < 0 && prevVx >= 0) wentBack = true;
    prevVx = vx; if (x > maxX) maxX = x;
    if (y < 0 && t > DT) break; if (t > 16) break;
  }
  return { sd: x / 0.4, wentBack, maxX, T: t };
}

const f = (x, n = 3) => Number(x).toFixed(n);
const line = (s) => console.log(s);

line('='.repeat(84));
line('验证A: 逐点回算 gunboundexcel 开炮表（mode=angle 全表）, 判定风向符号约定');
line('  表基准: 距离 20sd, 力度取 nowind 表的 p81/p70/p50(sd=20), 发射角取表中 angle');
line('  若模型正确, 回算落点应 ≈ 20sd');
line('='.repeat(84));
for (const flip of [false, true]) {
  let n = 0, sumAbs = 0, maxAbs = 0, within1 = 0;
  const byMatrix = {};
  for (const key of Object.keys(table.matrices)) {
    const m = table.matrices[key];
    const baseAng = parseInt(key.split('_')[0], 10);
    const pw = BASE_POWER[baseAng];
    let mn = 0, msum = 0, mmax = 0;
    for (const e of m.entries) {
      if (e.mode !== 'angle') continue;
      const r = sim(pw, e.angle, e.wa, e.ws, flip);
      if (!r) continue;
      const err = r.sd - BASE_SD;
      n++; mn++; sumAbs += Math.abs(err); msum += Math.abs(err);
      if (Math.abs(err) > maxAbs) maxAbs = Math.abs(err);
      if (Math.abs(err) > mmax) mmax = Math.abs(err);
      if (Math.abs(err) <= 1) within1++;
    }
    byMatrix[key] = { n: mn, avg: msum / mn, max: mmax };
  }
  line(`\n  【${flip ? '翻转风向 cos(180-wa)' : '当前实现 cos(wa)'}】 总点数=${n}  平均|误差|=${f(sumAbs / n)} sd  最大|误差|=${f(maxAbs)} sd  |误差|<=1sd 占比=${f(within1 / n * 100, 1)}%`);
  for (const k of Object.keys(byMatrix)) {
    line(`     ${k.padEnd(6)} n=${String(byMatrix[k].n).padStart(4)}  平均|误差|=${f(byMatrix[k].avg)} sd  最大=${f(byMatrix[k].max)} sd`);
  }
}

line('');
line('='.repeat(84));
line('验证B: 表内是否存在需要「回旋/折射」才能命中的条目');
line('  对每条目: 用表中角度回算, 检查是否 wentBack, 以及 maxX 与落点关系');
line('='.repeat(84));
{
  const stats = { total: 0, wentBack: 0, reflexFront: 0 };
  const samples = [];
  for (const key of Object.keys(table.matrices)) {
    const m = table.matrices[key];
    const baseAng = parseInt(key.split('_')[0], 10);
    const pw = BASE_POWER[baseAng];
    for (const e of m.entries) {
      if (e.mode !== 'angle') continue;
      const r = sim(pw, e.angle, e.wa, e.ws, false);
      if (!r) continue;
      stats.total++;
      if (r.wentBack) {
        stats.wentBack++;
        if (r.sd > 0) { stats.reflexFront++; if (samples.length < 12) samples.push({ key, ...e, sd: r.sd, maxX: r.maxX, T: r.T }); }
      }
    }
  }
  line(`  总条目=${stats.total}  回旋(wentBack)=${stats.wentBack}  其中落点仍在前方(sd>0)=${stats.reflexFront}`);
  if (samples.length) {
    line('  样例(表内确实需要回旋命中前方的条目):');
    line('    矩阵   ws   wa   表角度  回算落点sd  最大x(excel)  T');
    samples.forEach(s => line(`    ${s.key.padEnd(6)} ${String(s.ws).padStart(2)}  ${String(s.wa).padStart(3)}   ${String(s.angle).padStart(5)}   ${f(s.sd, 2).padStart(8)}   ${f(s.maxX, 3).padStart(9)}   ${f(s.T, 2)}`));
  }
}

line('');
line('='.repeat(84));
line('验证C: 表内最大/最小所需角度 & 逆风极限 (哪些 (ws,wa) 表要求的角度最低)');
line('='.repeat(84));
{
  const rows = [];
  for (const key of Object.keys(table.matrices)) {
    const m = table.matrices[key];
    const baseAng = parseInt(key.split('_')[0], 10);
    for (const e of m.entries) {
      if (e.mode !== 'angle') continue;
      rows.push({ key, ws: e.ws, wa: e.wa, angle: e.angle, base: baseAng, coef: e.coef });
    }
  }
  rows.sort((a, b) => a.angle - b.angle);
  line('  表内角度最低的 8 条（逆风最强 = 需要最平的角度）:');
  rows.slice(0, 8).forEach(r => line(`    ${r.key.padEnd(6)} ws=${String(r.ws).padStart(2)} wa=${String(r.wa).padStart(3)} angle=${f(r.angle, 2)} (base=${r.base}, coef=${f(r.coef, 3)})`));
  line('  表内角度最高的 8 条（顺风最强 = 需要最陡的角度）:');
  rows.slice(-8).forEach(r => line(`    ${r.key.padEnd(6)} ws=${String(r.ws).padStart(2)} wa=${String(r.wa).padStart(3)} angle=${f(r.angle, 2)} (base=${r.base}, coef=${f(r.coef, 3)})`));
  const coefMax = rows.reduce((b, r) => Math.abs(r.coef) > Math.abs(b.coef) ? r : b, rows[0]);
  line(`  最大角修正量: ${coefMax.key} ws=${coefMax.ws} wa=${coefMax.wa} angle=${f(coefMax.angle, 2)} coef=${f(coefMax.coef, 3)}  (相对基础角 ${coefMax.base} 修正 ${f(coefMax.coef, 2)}°)`);
}
