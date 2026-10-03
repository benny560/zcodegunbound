// 决定性检验: HOOKFUL 表在「回旋(折射)模型」下是否自洽且单调
const G = 0.608, IPS = 0.4;
const mass = (w) => 85 - 0.005 * w * w;

// 回旋数值积分 (正确落差约定: y 从 0 起, 落地 y<0)
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
  return { x, maxX, t, wentBack };
}
const HOOKFUL = [
  [1, 74], [2, 70], [3, 66], [4, 63], [5, 59], [6, 55], [7, 52], [8, 49],
  [9, 45], [10, 41], [11, 37], [12, 33], [13, 29], [14, 26], [15, 22], [16, 18],
];
const f = (v, n = 2) => Number(v).toFixed(n);
const L = (s) => console.log(s);

L('='.repeat(94));
L('检验5: 回旋(RK4)模型下, HOOKFUL 的 (partes → 角度) 是否单调对应距离');
L('  判据: 若该表是"满力 + 逆风折射"的定角表, 则 partes↑ → 角度↓ → 落点应单调↑');
L('='.repeat(94));
for (const power of [3.0, 4.0]) {
  for (const ws of [0, 8, 12, 16, 20, 24, 26]) {
    const xs = [], back = [];
    let ok = true;
    for (const [p, a] of HOOKFUL) {
      const r = sim(power, a, 180, ws);
      if (!r) { ok = false; break; }
      xs.push(r.x / IPS); back.push(r.wentBack ? 1 : 0);
      if (xs.length > 1 && xs[xs.length - 1] < xs[xs.length - 2] - 1e-6) ok = false;
    }
    if (!ok || xs.length !== HOOKFUL.length) { L(`\n  力度${f(power,1)} 纯逆风ws=${String(ws).padStart(2)}: ✗ 非单调或无解`); continue; }
    const mono = xs.every((v, i) => i === 0 || v >= xs[i - 1]);
    L(`\n  力度${f(power,1)} 纯逆风ws=${String(ws).padStart(2)}: ${mono ? '★单调递增 ✓' : '✗ 非单调'}`);
    L(`     落点(sd): ${HOOKFUL.map(([p, a], i) => `p${p}=${f(xs[i], 1)}`).join(' ')}`);
    L(`     折射标记: ${back.join('')}  (1=发生回旋)`);
  }
}

L('');
L('='.repeat(94));
L('检验6: 用 Hook sheet 自己的风向 110° 试');
L('='.repeat(94));
for (const ws of [8, 12, 16, 20, 26]) {
  const xs = [];
  let ok = true;
  for (const [p, a] of HOOKFUL) {
    const r = sim(3.0, a, 110, ws);
    if (!r) { ok = false; break; }
    xs.push(r.x / IPS);
  }
  if (!ok) { L(`  力度3.0 风(110°,${ws}): 无解`); continue; }
  const mono = xs.every((v, i) => i === 0 || v >= xs[i - 1]);
  L(`  力度3.0 风(110°,${String(ws).padStart(2)}): ${mono ? '★单调 ✓' : '✗ 非单调'}  落点(sd) p1..p16: ${xs.map(v => f(v, 1)).join(' ')}`);
}

L('');
L('='.repeat(94));
L('检验7: 若采用(力度3.0, 纯逆风ws=26)成功口径, 拟合 parts↔距离 与 parts↔角度');
L('='.repeat(94));
{
  const ws = 26, power = 3.0;
  const data = [];
  for (const [p, a] of HOOKFUL) {
    const r = sim(power, a, 180, ws);
    data.push({ p, a, sd: r.x / IPS, wentBack: r.wentBack, T: r.t });
  }
  const mono = data.every((d, i) => i === 0 || d.sd >= data[i - 1].sd);
  L(`  单调性: ${mono ? '✓ 单调递增' : '✗ 非单调'}`);
  L('  partes | 角度 | 落点sd | 回旋 | 飞行T');
  data.forEach(d => L(`  ${String(d.p).padStart(6)} | ${String(d.a).padStart(4)} | ${f(d.sd, 2).padStart(6)} | ${d.wentBack ? ' 是 ' : ' 否 '} | ${f(d.T, 2)}`));
  // 拟合 sd = g(p)
  const n = data.length;
  const sx = data.reduce((s, d) => s + d.p, 0), sy = data.reduce((s, d) => s + d.sd, 0);
  const sxx = data.reduce((s, d) => s + d.p * d.p, 0), sxy = data.reduce((s, d) => s + d.p * d.sd, 0);
  const b = (n * sxy - sx * sy) / (n * sxx - sx * sx), a0 = (sy - b * sx) / n;
  let maxR = 0;
  data.forEach(d => { maxR = Math.max(maxR, Math.abs(d.sd - (a0 + b * d.p))); });
  L(`\n  线性拟合: 距离(sd) = ${f(a0, 4)} + ${f(b, 4)} * partes   最大残差 ${f(maxR, 3)} sd`);
  L(`  代回角度式: partes = (sd - ${f(a0, 4)}) / ${f(b, 4)}  →  angle = 77.13 - 3.523p - 0.0107p²`);
}
