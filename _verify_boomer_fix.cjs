// 从 gunbound_calculator.html 抽取 Boomer 相关函数做端到端验证
const fs = require('fs');
const code = fs.readFileSync('gunbound_calculator.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

function grabFunc(name) {
  const re = new RegExp('function ' + name + '\\s*\\(');
  const i = code.search(re);
  if (i < 0) return null;
  let j = i, depth = 0, started = false;
  for (; j < code.length; j++) {
    const ch = code[j];
    if (ch === '{') { depth++; started = true; }
    if (ch === '}') { depth--; if (started && depth === 0) { j++; break; } }
  }
  return code.slice(i, j) + '\n';
}
function grabConst(name) {
  const re = new RegExp('const ' + name + '\\s*=');
  const i = code.search(re);
  if (i < 0) return null;
  let j = i, depth = 0, started = false;
  for (; j < code.length; j++) {
    const ch = code[j];
    if ('{['.includes(ch)) { depth++; started = true; }
    if ('}]'.includes(ch)) { depth--; if (started && depth === 0) { j++; break; } }
  }
  return code.slice(i, j + (code[j] === ';' ? 1 : 0)) + '\n';
}

let s = 'const DISTANCE_PIXELS_PER_20SD=800/20, ELEVATION_PIXELS_PER_UNIT=516/13, MAX_DISPLAY_POWER=5, BOOMER_MAX_POWER=5;\n';
s += 'const document={getElementById:(id)=>({value:id==="fixed-power"?"3.0":"0"})};\n';
s += `const EXCEL_VEHICLE={vehicles:{boomer:{name:'Boomer',gravity:0.608,massBase:85,massWindCoeff:0.005,massType:'wind_dependent',baseTime:3.00098,distanceScale:0.4,distanceMode:'scaled',elevationMode:'raw'}},getMass(id,w){const v=this.vehicles[id];return v.massType==='constant'?v.massBase:v.massBase-w*w*v.massWindCoeff}};\n`;
for (const n of ['getExcelUnits','calcExcelWindParams','buildExcelResult','calcExcelCenterTrajectory','calcExcelFromTime','calcExcelFromPower','simBoomerTrajectory','calcBoomerTestPower','calcBoomerTestAngle','calcBoomerTestMode','calcBoomerModes','buildBoomerFan','boomerChartAngle']) {
  const f = grabFunc(n);
  if (!f) { console.log('MISS func', n); process.exit(1); }
  s += f;
}
const bm = grabConst('BOOMER_MODES');
if (!bm) { console.log('MISS BOOMER_MODES'); process.exit(1); }
s += bm;
s += 'module.exports={calcBoomerModes,calcBoomerTestMode,calcExcelCenterTrajectory,BOOMER_MODES,buildBoomerFan,boomerChartAngle,calcExcelWindParams};\n';
fs.writeFileSync('_extracted_boomer.js', s);

const M = require('./_extracted_boomer.js');
const show = (title, wa, ws, dist) => {
  console.log('=== ' + title + ' (dist=' + dist + 'sd wa=' + wa + ' ws=' + ws + ') ===');
  for (const m of M.calcBoomerModes(dist, null, wa, ws, 8, 0)) {
    console.log('  ' + m.name.padEnd(10), m.result
      ? ('角度' + Math.round(m.result.angle) + '° 力度' + m.result.power.toFixed(4) + (m.result.wentBack ? ' [回旋]' : ' [直飞]'))
      : '— ' + (m.failReason || ''));
  }
};
show('逆风(回旋系应生效)', 180, 19, 20);
show('逆风+上风(表快照场景)', 110, 7, 20);
show('顺风(回旋系应门控)', 0, 10, 20);
show('无风', 0, 0, 20);
show('短距逆风(折射区)', 180, 19, 10);

// 回旋弹道全景分类统计
console.log('\n=== buildBoomerFan 弹道族分类 (power=3.0 全角度扫掠) ===');
const clsColor = { 'rgba(245,158,11,0.55)': '折射回旋', 'rgba(239,68,68,0.55)': '背射落身后', 'rgba(100,116,139,0.25)': '直飞' };
for (const [wa, ws] of [[180, 19], [180, 15], [110, 7], [0, 10], [0, 0]]) {
  const fan = M.buildBoomerFan(20, wa, ws, 8, 0);
  const cnt = {};
  fan.forEach(f => { cnt[clsColor[f._color] || f._color] = (cnt[clsColor[f._color] || f._color] || 0) + 1; });
  const xs = fan.map(f => f.trajectory[f.trajectory.length - 1].x);
  console.log(`wa=${String(wa).padStart(3)} ws=${String(ws).padStart(2)}  曲线${fan.length}条 落点范围[${Math.min(...xs).toFixed(0)},${Math.max(...xs).toFixed(0)}]px`, JSON.stringify(cnt));
}

// 回旋公式表(粗扫描版)正确性: 与精确模式解对照
console.log('\n=== 回旋公式表 boomerChartAngle 抽查 vs calcBoomerTestMode ===');
const t0 = Date.now();
for (const [wa, ws] of [[180, 19], [180, 24]]) {
  const wp = M.calcExcelWindParams('boomer', wa, ws);
  for (const p of [1.0, 2.0, 3.0]) {
    let line = `wa=${wa} ws=${ws} 力${p}: `;
    for (const sd of [5, 10, 15, 20]) {
      const a = M.boomerChartAngle(p, wp, sd * 0.4, 0, true);
      const b = M.boomerChartAngle(p, wp, -sd * 0.4, 0, false);
      line += `${sd}sd[折${a == null ? '--' : a.toFixed(1)}/背${b == null ? '--' : b.toFixed(1)}] `;
    }
    console.log(' ', line);
  }
}
console.log('  耗时', Date.now() - t0, 'ms');
