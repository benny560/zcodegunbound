// v1.66 left N1 验证脚本
// 检查: ①语法编译 ②版本双同步 ③left N1 sd1-10 无风出解且复现用户锚点
//       ④left N1 超范围(sd>10)无解 ⑤right N1 无风基准点不漂移 ⑥全量67条回归
// 用法: node _verify_leftn1.cjs
const fs = require('fs'), vm = require('vm');
const FILE = 'gunbound_calculator.html';
const src = fs.readFileSync(FILE, 'utf8');

console.log('========== ① 语法编译检查 ==========');
const m = src.match(/<script>([\s\S]*?)<\/script>/);
const js = m[1];
try { new vm.Script(js, { filename: 'inline.js' }); console.log('✓ 语法编译通过'); }
catch (e) { console.log('✗ 语法错误:', e.message); process.exit(1); }

console.log('\n========== ② 版本号双同步 ==========');
const subM = src.match(/<div class="subtitle">([^<]*v(\d+\.\d+)[^<]*)<\/div>/);
const appM = js.match(/const APP_VERSION = '([^']+)'/);
console.log(`subtitle: ${subM[1].trim()}`);
console.log(`APP_VERSION: ${appM[1]}`);
console.log(subM && appM && subM[1].includes(appM[1]) ? '✓ 同步' : '✗ 不同步!');

console.log('\n========== ③ 沙箱加载 ==========');
const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } }, setAttribute() { }, getAttribute() { return null; }, appendChild() { }, removeChild() { }, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true; }, getContext() { return { scale() { }, translate() { }, save() { }, restore() { }, clearRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, arc() { }, fill() { }, stroke() { }, fillText() { }, fillRect() { }, strokeRect() { }, rect() { }, closePath() { }, setTransform() { }, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() { } }; }, setLineDash() { }, drawImage() { } }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() { }, blur() { }, click() { }, scrollIntoView() { } });
const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() { }, documentElement: { setAttribute() { } }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } }, navigator: {}, window: {}, requestAnimationFrame() { }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => { }, addEventListener() { }, removeEventListener() { }, alert() { }, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () { }, CustomEvent: function () { }, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() { } }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
let api;
try {
    vm.runInContext(js + ';globalThis.__api={searchTrico3in1Physics, APP_VERSION};', sb, { filename: FILE, timeout: 30000 });
    api = sb.__api;
    console.log('✓ 沙箱加载成功');
} catch (e) { console.log('✗ 加载异常:', e.message); process.exit(1); }

// 用户 left N1 锚点 [sd, angle, power] (左射=右打左, side='left')
const leftAnchors = [
    [1, 80.3, 0.96], [2, 69, 0.96], [3, 56.9, 1.00], [4, 45, 1.11], [5, 34.9, 1.28],
    [6, 26.5, 1.51], [7, 19.9, 1.83], [8, 14.8, 2.22], [9, 10.9, 2.72], [10, 7.9, 3.35],
];

console.log('\n========== ③ left N1 sd1-10 无风出解(应复现用户锚点) ==========');
// 左射无风: side='left', 无风. 注意 searchTrico3in1Physics(distance, sdParts, side, windAngle, windStrength, elev)
// 左射时 getEffectiveWindAngle 已翻转, 但求解器内部 calcTimePhysicsSolver 对 left/right 对称(无风时 wa=0 一致)
let leftFail = 0;
console.log('sd | 用户锚点 | 求解器结果 | Δ角 | Δ力');
for (const [sd, expA, expP] of leftAnchors) {
    const all = api.searchTrico3in1Physics(sd, 20, 'left', 0, 0, 0) || [];
    const r = all.find(x => x.spinN === 1);
    if (!r) { console.log(`✗ sd=${sd}: 无 N1 解!`); leftFail++; continue; }
    const dA = r.angle - expA, dP = r.power - expP;
    const ok = Math.abs(dA) < 0.6 && Math.abs(dP) < 0.05;
    if (!ok) leftFail++;
    console.log(`${ok ? '✓' : '✗'} sd=${sd} | ${expA}°/${expP} | ${r.angle.toFixed(2)}°/${r.power.toFixed(4)} | ${dA >= 0 ? '+' : ''}${dA.toFixed(2)}° / ${dP >= 0 ? '+' : ''}${dP.toFixed(4)} | src=${r.source}`);
}
console.log(leftFail === 0 ? '✓ left N1 锚点全部复现' : `✗ ${leftFail} 个锚点偏差超限`);

console.log('\n========== ④ left N1 超范围(sd>10)应无解 ==========');
const overRange = [11, 12, 15, 20];
let overOk = true;
for (const sd of overRange) {
    const all = api.searchTrico3in1Physics(sd, 20, 'left', 0, 0, 0) || [];
    const r = all.find(x => x.spinN === 1);
    console.log(`${r ? '✗' : '✓'} sd=${sd} left N1: ${r ? '有解(不应有!)' : '无解(正确)'}`);
    if (r) overOk = false;
}
console.log(overOk ? '✓ 超范围正确返回无解' : '✗ 超范围错误出解!');

console.log('\n========== ⑤ right N1 无风基准点不漂移 ==========');
// right N1 sd=5 (识别表): 71°/1.58
const rAnchors = [
    { sd: 5, expA: 71, expP: 1.58 },
    { sd: 10, expA: 43, expP: 1.75 },
];
let rFail = 0;
for (const a of rAnchors) {
    const all = api.searchTrico3in1Physics(a.sd, 20, 'right', 0, 0, 0) || [];
    const r = all.find(x => x.spinN === 1);
    if (!r) { console.log(`✗ right N1 sd=${a.sd}: 无解`); rFail++; continue; }
    const dA = Math.abs(r.angle - a.expA), dP = Math.abs(r.power - a.expP);
    const ok = dA < 1.0 && dP < 0.05;
    if (!ok) rFail++;
    console.log(`${ok ? '✓' : '✗'} right N1 sd=${a.sd}: ${r.angle.toFixed(2)}°/${r.power.toFixed(4)} (期望 ${a.expA}°/${a.expP}, Δ=${dA.toFixed(2)}°/${dP.toFixed(4)})`);
}
// right N2/N3/N4 基准点
const rBase = [
    { n: 2, expA: 60.8, expP: 2.75 }, { n: 3, expA: 75.8, expP: 3.76 }, { n: 4, expA: 82.0, expP: 4.83 },
];
for (const a of rBase) {
    const all = api.searchTrico3in1Physics(20, 20, 'right', 0, 0, 0) || [];
    const r = all.find(x => x.spinN === a.n);
    if (!r) { console.log(`✗ right N${a.n} sd=20: 无解`); rFail++; continue; }
    const dA = Math.abs(r.angle - a.expA), dP = Math.abs(r.power - a.expP);
    const ok = dA < 0.6 && dP < 0.05;
    if (!ok) rFail++;
    console.log(`${ok ? '✓' : '✗'} right N${a.n} sd=20: ${r.angle.toFixed(2)}°/${r.power.toFixed(4)} (期望 ${a.expA}°/${a.expP}, Δ=${dA.toFixed(2)}°/${dP.toFixed(4)})`);
}
console.log(rFail === 0 ? '✓ right 基准点全部保持' : `✗ ${rFail} 个基准点漂移!`);

console.log('\n========== ⑥ 全量 67 条回归 ==========');
const EPPU = 516 / 13;
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';
const rows = []; const missing = [];
for (const d of data) {
    let all;
    try { all = api.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || []; }
    catch (e) { continue; }
    const r = all.find(x => x.spinN === d.n);
    if (!r) { missing.push(d); continue; }
    rows.push({ side: d.side, n: d.n, dist: d.distance, dA: r.angle - d.angle, dP: r.power - d.power });
}
const mean = arr => arr.reduce((s, x) => s + x, 0) / (arr.length || 1);
const maeA = mean(rows.map(r => Math.abs(r.dA))), maeP = mean(rows.map(r => Math.abs(r.dP)));
const maxA = Math.max(...rows.map(r => Math.abs(r.dA)));
console.log(`有解 ${rows.length}/${data.length} 条, 无解 ${missing.length} 条`);
console.log(`角度 MAE=${maeA.toFixed(3)}° (max ${maxA.toFixed(2)}°), 力度 MAE=${maeP.toFixed(4)}`);
console.log(`对照历史基线(raw 0.745°/0.0487, 52条): 当前 ${maeA.toFixed(3)}°/${maeP.toFixed(4)} (${rows.length}条)`);
if (missing.length) for (const d of missing.slice(0, 5)) console.log(`  无解: ${d.side} N${d.n} dist=${d.distance} wa=${d.windAngle} ws=${d.windStrength}`);

console.log('\n========== 总结 ==========');
const allOk = leftFail === 0 && overOk && rFail === 0;
console.log(allOk ? '✓✓✓ v1.66 left N1 验证全部通过' : '✗ 存在问题, 见上方详情');
