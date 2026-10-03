// v1.65 主程序 debug 体检脚本
// 检查: ①script语法编译 ②沙箱加载运行时错误 ③版本双同步 ④无风基准点 ⑤67条全量回归 ⑥重复函数定义
// 用法: node _debug_v165.cjs
const fs = require('fs'), vm = require('vm');
const FILE = 'gunbound_calculator.html';
const src = fs.readFileSync(FILE, 'utf8');

console.log('========== ① <script> 语法编译检查 ==========');
const m = src.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.log('✗ 未找到 <script> 块'); process.exit(1); }
const js = m[1];
console.log(`script 块大小: ${(js.length / 1024).toFixed(1)} KB`);
try {
    new vm.Script(js, { filename: 'inline-script.js' });
    console.log('✓ 语法编译通过（无 SyntaxError）');
} catch (e) {
    console.log(`✗ 语法错误: ${e.message}`);
    process.exit(1);
}

console.log('\n========== ② 版本号双同步检查 ==========');
const subM = src.match(/<div class="subtitle">([^<]*v(\d+\.\d+)[^<]*)<\/div>/);
const appM = js.match(/const APP_VERSION = '([^']+)'/);
console.log(`subtitle: ${subM ? subM[1].trim() : '未找到'}`);
console.log(`APP_VERSION: ${appM ? appM[1] : '未找到'}`);
if (subM && appM && subM[1].includes(appM[1])) console.log('✓ 两处版本号同步');
else console.log('✗ 版本号不同步！');

console.log('\n========== ③ 重复函数定义扫描 ==========');
const fnDefs = {};
const re = /^\s*function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
let mm;
while ((mm = re.exec(js))) { (fnDefs[mm[1]] = fnDefs[mm[1]] || []).push(js.slice(0, mm.index).split('\n').length); }
const dups = Object.entries(fnDefs).filter(([k, v]) => v.length > 1);
if (dups.length) { console.log('✗ 发现重复定义:'); for (const [k, v] of dups) console.log(`  ${k} 定义 ${v.length} 次 @行 ${v.join(',')}`); }
else console.log(`✓ 无重复函数定义（共 ${Object.keys(fnDefs).length} 个顶层函数）`);

console.log('\n========== ④ 沙箱加载（运行时错误检查） ==========');
const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } }, setAttribute() { }, getAttribute() { return null; }, appendChild() { }, removeChild() { }, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true; }, getContext() { return { scale() { }, translate() { }, save() { }, restore() { }, clearRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, arc() { }, fill() { }, stroke() { }, fillText() { }, fillRect() { }, strokeRect() { }, rect() { }, closePath() { }, setTransform() { }, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() { } }; }, setLineDash() { }, drawImage() { } }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() { }, blur() { }, click() { }, scrollIntoView() { } });
const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() { }, documentElement: { setAttribute() { } }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } }, navigator: {}, window: {}, requestAnimationFrame() { }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => { }, addEventListener() { }, removeEventListener() { }, alert() { }, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () { }, CustomEvent: function () { }, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() { } }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
let api;
try {
    vm.runInContext(js + ';globalThis.__api={searchTrico3in1Physics, APP_VERSION};', sb, { filename: FILE, timeout: 30000 });
    api = sb.__api;
    console.log('✓ 沙箱加载成功，无运行时异常');
} catch (e) {
    console.log(`✗ 沙箱加载异常: ${e.message}\n${(e.stack || '').split('\n').slice(0, 5).join('\n')}`);
    process.exit(1);
}

console.log('\n========== ⑤ 无风基准点检查（硬约束） ==========');
// RULES 16.5: N2=60.8/2.75、N3=76/3.76、N4=82/4.83 (右攻 sd=20 无风)
const anchors = [
    { side: 'right', n: 2, expA: 60.8, expP: 2.75 },
    { side: 'right', n: 3, expA: 76.0, expP: 3.76 },
    { side: 'right', n: 4, expA: 82.0, expP: 4.83 },
];
let anchorFail = 0;
for (const a of anchors) {
    const all = api.searchTrico3in1Physics(20, 20, a.side, 0, 0, 0) || [];
    const r = all.find(x => x.spinN === a.n);
    if (!r) { console.log(`✗ right N${a.n} sd=20 无风: 无解`); anchorFail++; continue; }
    const dA = Math.abs(r.angle - a.expA), dP = Math.abs(r.power - a.expP);
    const ok = dA < 0.6 && dP < 0.05;
    if (!ok) anchorFail++;
    console.log(`${ok ? '✓' : '✗'} right N${a.n} sd=20: ${r.angle.toFixed(2)}°/${r.power.toFixed(4)}  (期望 ${a.expA}°/${a.expP}, Δ=${dA.toFixed(2)}°/${dP.toFixed(3)})`);
}
console.log(anchorFail === 0 ? '✓ 无风基准点全部保持' : `✗ ${anchorFail} 个基准点漂移!`);

console.log('\n========== ⑥ 67 条实测全量回归 ==========');
const EPPU = 516 / 13;
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';
const rows = []; const missing = [];
for (const d of data) {
    const dir = sk(d);
    let all;
    try { all = api.searchTrico3in1Physics(d.distance, 20, dir, eff(d), d.windStrength, (d.elevation || 0) * EPPU) || []; }
    catch (e) { console.log(`✗ 求解器抛异常: ${d.side} N${d.n} dist=${d.distance}: ${e.message}`); continue; }
    const r = all.find(x => x.spinN === d.n);
    if (!r) { missing.push(d); continue; }
    rows.push({ side: d.side, n: d.n, dist: d.distance, dA: r.angle - d.angle, dP: r.power - d.power });
}
const mean = arr => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
const maeA = mean(rows.map(r => Math.abs(r.dA))), maeP = mean(rows.map(r => Math.abs(r.dP)));
const maxA = Math.max(...rows.map(r => Math.abs(r.dA)));
console.log(`有解 ${rows.length}/${data.length} 条, 无解 ${missing.length} 条`);
console.log(`角度 MAE=${maeA.toFixed(3)}° (max ${maxA.toFixed(2)}°), 力度 MAE=${maeP.toFixed(4)}`);
console.log(`0°偏差占比: ${rows.filter(r => Math.abs(r.dA) < 0.5).length}/${rows.length}`);
console.log(`>2°偏差: ${rows.filter(r => Math.abs(r.dA) > 2).length} 条`);
if (missing.length) for (const d of missing.slice(0, 5)) console.log(`  无解: ${d.side} N${d.n} dist=${d.distance} elev=${d.elevation || 0} wa=${d.windAngle} ws=${d.windStrength}`);
// 参考基线(v1.0x, 52条): raw 0.745°/0.0487
console.log(`\n对照历史基线(raw 0.745°/0.0487, 52条样本): 当前 ${maeA.toFixed(3)}°/${maeP.toFixed(4)} (${rows.length}条)`);

console.log('\n========== ⑦ 死代码确认 ==========');
for (const fn of ['clampPhaseTimeBias', 'searchN2WindPhase', 'getBackshotTimeBias']) {
    const hits = (js.match(new RegExp(fn, 'g')) || []).length;
    console.log(`${fn}: ${hits} 次出现 ${hits === 1 ? '(仅定义=死代码,可删)' : hits === 2 ? '(定义+1调用)' : ''}`);
}

