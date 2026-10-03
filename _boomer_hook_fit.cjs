// 从 boomer revolution.xlsm 的 Hook 系列 sheet 归纳可用公式
const G = 0.608;

// ---- 从 HOOKFUL sheet 提取的原始数据 (r1-r12) ----
const HOOKFUL = [
  [1, 74], [2, 70], [3, 66], [4, 63], [5, 59],
  [6, 55], [7, 52], [8, 49], [9, 45], [10, 41],
  [11, 37], [12, 33], [13, 29], [14, 26], [15, 22], [16, 18],
];
// ---- Hook MENOS: Distance 28.8, Desnivel 0 → 定角→力度 ----
const HOOK_MENOS = { 35: 2.8398074451031796, 40: 2.9284017636808319, 45: 3.1099811489427136, 50: 3.3378978152861976, 55: 3.5128550999098662 };
// ---- Hook (逆风侧): Distance 30, Desnivel 0, wind dir 110°, wind 7 ----
const HOOK_HEAD = { 20: 2.6025347832284673, 40: 2.9284017636808319, 45: 3.1099811489427136, 50: 3.3878978152861974, 55: 3.6128550999098663 };
// ---- Hook (FAVOR 侧): 同 Distance 30 / wind(110°,7) ----
const HOOK_FAVOR = { 30: 2.248325116163715, 40: 2.0637066422935679, 50: 2.0848961107245518, 60: 2.3232358971576272, 70: 2.780756595711718, 75: 3.2544473018665605, 80: 4.2160210991374782, 85: 7.90276537779281 };
// ---- BS sheet: "BACK SHOT TESTAR", power 3.0 → partes→角度 ----
const BS = [[4, 49.7224], [8, 53.7224], [12, 57.7224], [16, 61.7224]];

const f = (v, n = 4) => Number(v).toFixed(n);
const L = (s) => console.log(s);

// ============ 最小二乘拟合 ============
function polyfit(xs, ys, deg) {
  const n = deg + 1;
  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const b = new Array(n).fill(0);
  for (let i = 0; i < xs.length; i++) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) A[r][c] += Math.pow(xs[i], r + c);
      b[r] += ys[i] * Math.pow(xs[i], r);
    }
  }
  // 高斯消元
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[p][i])) p = k;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let k = i + 1; k < n; k++) {
      const fct = A[k][i] / A[i][i];
      for (let j = i; j < n; j++) A[k][j] -= fct * A[i][j];
      b[k] -= fct * b[i];
    }
  }
  const co = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * co[j];
    co[i] = s / A[i][i];
  }
  return co;
}
const evalPoly = (co, x) => co.reduce((s, c, i) => s + c * Math.pow(x, i), 0);

L('='.repeat(92));
L('拟合1: HOOKFUL 满力折射表  angle = f(partes)');
L('='.repeat(92));
const px = HOOKFUL.map(r => r[0]), py = HOOKFUL.map(r => r[1]);
for (const deg of [1, 2, 3]) {
  const co = polyfit(px, py, deg);
  let maxR = 0, sum2 = 0;
  const res = HOOKFUL.map(([p, a]) => { const e = a - evalPoly(co, p); maxR = Math.max(maxR, Math.abs(e)); sum2 += e * e; return e; });
  L(`   ${deg}次: angle = ${co.map((c, i) => `${f(c, 6)}${i ? '*p^' + i : ''}`).join(' + ')}`);
  L(`        最大残差 = ${f(maxR, 3)}°   RMS = ${f(Math.sqrt(sum2 / HOOKFUL.length), 3)}°`);
  if (deg === 1) L(`        残差序列: [${res.map(r => (r >= 0 ? '+' : '') + f(r, 2)).join(', ')}]`);
}
{
  // 简单线性端点式
  const slope = (18 - 74) / 15;
  L(`   端点线性式: angle = ${f(74 - slope, 4)} - ${f(slope, 4)}*partes   (parte1=74°, parte16=18°)`);
  let maxR = 0;
  for (const [p, a] of HOOKFUL) maxR = Math.max(maxR, Math.abs(a - (74 - slope * (p - 1))));
  L(`        最大残差 = ${f(maxR, 3)}°`);
}
L(`   步长序列: [${HOOKFUL.slice(1).map((r, i) => f(r[1] - HOOKFUL[i][1], 0)).join(', ')}]`);

L('');
L('='.repeat(92));
L('拟合2: BS 背射表  angle = f(partes) @力度3.0');
L('='.repeat(92));
{
  const co = polyfit(BS.map(r => r[0]), BS.map(r => r[1]), 1);
  L(`   线性: angle = ${f(co[0], 4)} + ${f(co[1], 4)}*partes   (斜面 ${f(co[1], 4)}°/parte)`);
  let maxR = 0;
  for (const [p, a] of BS) maxR = Math.max(maxR, Math.abs(a - evalPoly(co, p)));
  L(`   最大残差 = ${f(maxR, 4)}°  ⇒ 4点严格共线, 已知 4/8/12/16 partes 完全线性`);
  L(`   注意: BS 斜率 = ${f(co[1], 3)}/parte (角度随partes 递增), HOOKFUL 斜率 = ${f((18 - 74) / 15, 3)}/parte (递减) — 两族方向相反`);
}

L('');
L('='.repeat(92));
L('检验3: 风力修正公式  angle = base - k*wind  (来源 Hooke sheet: 46 - 8*0.7 = 40.4)');
L('='.repeat(92));
L(`   Hooke: base=46, Vento=8, Fator=0.7 → RESULTADO = 46 - 8*0.7 = ${f(46 - 8 * 0.7, 2)} (sheet 实际值 40.4) ✓`);
L('   Hook sheet 里各角度族的偏移量, 反推除数 K:');
const families = [
  { name: '无除数 (AD19)', vento: 0, offset: 0, K: null },
  { name: 'DIVISÃO POR 10', vento: 22, offset: 2.2, K: 10 },
  { name: 'DIVISÃO POR 3', vento: 13, offset: 13 / 3, K: 3 },
  { name: 'DIVISÃO POR 2', vento: 12, offset: 6, K: 2 },
];
for (const fm of families) {
  L(`     ${fm.name.padEnd(16)} Vento=${String(fm.vento).padStart(2)}  偏移=${f(fm.offset, 3)}  ⇒ 角度 = 90 - partes - ${f(fm.offset, 3)}   K=${fm.K ?? '—'}`);
}
L('   ⇒ 结构统一为「基准角 - 风偏移」, 只是不同风量级用不同除数 (2/3/10 / 0.7)');

L('');
L('='.repeat(92));
L('检验4 [决定性]: HOOKFUL 的角度序列能否与「恒定力度」的闭式解自洽');
L('   闭式: x = v² · denom,  denom = 2cs/gEff + 2xA·s²/gEff²');
L('   若 partes 单调对应距离, 则同力度下 x 必须随 partes 单调');
L('='.repeat(92));
function closedX(angleDeg, power, wa, ws) {
  const mass = 85 - 0.005 * ws * ws;
  const r = wa * Math.PI / 180;
  const xA = Math.cos(r) * ws / mass, effGrav = G - Math.sin(r) * ws / mass;
  const rad = angleDeg * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
  const denom = (2 * c * s) / effGrav + (2 * xA * s * s) / (effGrav * effGrav);
  return power * power * denom;
}
for (const [label, wa, ws] of [['无风', 0, 0], ['风(110°,7) — Hook表口径', 110, 7], ['纯逆风(180°,20)', 180, 20]]) {
  const xs = HOOKFUL.map(([p, a]) => closedX(a, 3.0, wa, ws));
  let mono = true;
  for (let i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1] - 1e-9) mono = false;
  L(`\n   ${label}: 力度3.0 下按 HOOKFUL 角度算得距离 x (excel单位)`);
  L(`     ${HOOKFUL.map(([p, a], i) => `p${p}(${a}°)=${f(xs[i], 2)}`).join('  ')}`);
  L(`     单调递增? ${mono ? '是 ✓' : '否 ✗  (跨越45°后回落)'}`);
}
L('\n   ⇒ 结论: 恒定力度下 x 在 45° 处取极大, HOOKFUL 角度 74°→18° 跨过了 45°,');
L('     所以该表的力度不是恒定的 (或 partes 不是单调距离口径)。');
L('     这说明 HOOKFUL 表本身混入了变力度/变风修正, 直接拟合会把这份不自洽一起固化。');
