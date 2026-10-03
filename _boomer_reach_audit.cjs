// Boomer: 逆风可达域 & 折射(回旋)可达域 精确边界
const G = 0.608, IPS = 0.4;
const mass = (w) => 85 - 0.005 * w * w;
function sim(power, angDeg, wa, ws) {
  const m = mass(ws), r = wa * Math.PI / 180;
  const xA = Math.cos(r) * ws / m, effGrav = G - Math.sin(r) * ws / m;
  if (effGrav <= 0) return null;
  const DT = 0.001;
  let vx = power * Math.cos(angDeg * Math.PI / 180), vy = power * Math.sin(angDeg * Math.PI / 180);
  let x = 0, y = 0, t = 0, wentBack = false, prevVx = vx, maxX = 0;
  for (let i = 0; i < 300000; i++) {
    vx += xA * DT; vy -= effGrav * DT; x += vx * DT; y += vy * DT; t += DT;
    if (vx < 0 && prevVx >= 0) wentBack = true;
    prevVx = vx; if (x > maxX) maxX = x;
    if (y < 0 && t > DT) break; if (t > 20) break;
  }
  return { x, maxX, t, wentBack, xA };
}
const f = (v, n = 2) => Number(v).toFixed(n);
const L = (s) => console.log(s);

L('='.repeat(88));
L('实验7: 纯逆风(wa=180°) 满力3.0 下的最大可达距离 (超过即计算器输出「无解」)');
L('  可达距离以 sd 表示; 对比 顺风 同风力可达距离');
L('='.repeat(88));
L('  风力 | 逆风最大可达(sd) | 顺风最大可达(sd) | 逆风/顺风');
for (const ws of [1, 2, 4, 6, 8, 10, 12, 15, 18, 21, 24, 26]) {
  let maxHead = 0, maxTail = 0;
  for (let a = 1; a <= 89; a += 0.25) {
    const h = sim(3.0, a, 180, ws); if (h && h.x > maxHead) maxHead = h.x;
    const t = sim(3.0, a, 0, ws); if (t && t.x > maxTail) maxTail = t.x;
  }
  L(`  ${String(ws).padStart(4)} | ${f(maxHead / IPS).padStart(16)} | ${f(maxTail / IPS).padStart(16)} | ${f(maxHead / maxTail, 3)}`);
}

L('');
L('='.repeat(88));
L('实验8: 「折射」精确可达域 = 回旋(wentBack) 且落点仍在前方 且 落点 < 最大前冲点');
L('  (=真正"飞出后被逆风吹回、命中前方目标"的形态)');
L('='.repeat(88));
L('  风力 | 折射可达 sd 区间 | 该形态最多能覆盖的sd | 最远折射落点处的 前冲峰值(sd)');
for (const ws of [6, 10, 14, 18, 22, 26]) {
  const pts = [];
  for (let a = 1; a <= 89; a += 0.1) {
    const r = sim(3.0, a, 180, ws);
    if (!r || !r.wentBack) continue;
    if (r.x > 0 && r.x < r.maxX - 1e-6) pts.push({ a, land: r.x / IPS, peak: r.maxX / IPS });
  }
  if (!pts.length) { L(`  ${String(ws).padStart(4)} | 无 (不存在真正的折射形态)`); continue; }
  pts.sort((p, q) => p.land - q.land);
  const lo = pts[0].land, hi = pts[pts.length - 1].land;
  const far = pts.reduce((b, p) => p.peak > b.peak ? p : b, pts[0]);
  L(`  ${String(ws).padStart(4)} | ${f(lo)} ~ ${f(hi)} sd | 覆盖 ${f(hi - lo)} sd | 峰值 ${f(far.peak)} sd (角度${f(far.a, 1)}°, 落点${f(far.land)} sd)`);
}

L('');
L('='.repeat(88));
L('实验9: 顺风形态 (对照附件3) — 同一距离所需角度随顺风变化');
L('  目标 sd=33 (excelDist=13.2), 满力3.0, wa=0 (纯顺风) / wa=90 (纯上风)');
L('='.repeat(88));
L('  风力 | 纯顺风所需角度 | 弧度形态(最高点sd) | 纯上风所需角度 | 弧度形态(最高点sd)');
for (const ws of [0, 5, 10, 15, 20, 25]) {
  const out = [];
  for (const wa of [0, 90]) {
    const m = mass(ws), r = wa * Math.PI / 180;
    const xA = Math.cos(r) * ws / m, effGrav = G - Math.sin(r) * ws / m;
    let best = null;
    for (let a = 1; a <= 89; a += 0.05) {
      const rr = sim(3.0, a, wa, ws);
      if (!rr) continue;
      const err = Math.abs(rr.x - 13.2);
      if (err < 0.01 && (!best || Math.abs(rr.x - 13.2) < Math.abs(best.r.x - 13.2))) best = { a, r: rr };
    }
    if (!best) { out.push('  无解 / —'); continue; }
    // 最高点
    const DT = 0.001;
    let vx = 3.0 * Math.cos(best.a * Math.PI / 180), vy = 3.0 * Math.sin(best.a * Math.PI / 180);
    let x = 0, y = 0, t = 0, ymax = 0, xAtMax = 0;
    for (let i = 0; i < 300000; i++) {
      vx += xA * DT; vy -= effGrav * DT; x += vx * DT; y += vy * DT; t += DT;
      if (y > ymax) { ymax = y; xAtMax = x; }
      if (y < 0 && t > DT) break; if (t > 20) break;
    }
    out.push(`${f(best.a, 1)}°  (顶点${f(xAtMax / IPS, 1)}sd, 高${f(ymax / IPS, 1)}sd)`);
  }
  L(`  ${String(ws).padStart(4)} | ${out[0]} | ${out[1]}`);
}
