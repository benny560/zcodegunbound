// 复现: 无风下 0落差→0.5落差 解跳变 (基线表路径 vs 落地时间求解器路径的模型断层)
const fs = require('fs'), vm = require('vm');
function loadApi(p) {
  const s = fs.readFileSync(p, 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {}, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; }, getContext() { return { scale() {}, translate() {}, save() {}, restore() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, fillText() {}, fillRect() {}, strokeRect() {}, rect() {}, closePath() {}, setTransform() {}, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() {} }; }, setLineDash() {}, drawImage() {} }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() {}, blur() {}, click() {}, scrollIntoView() {} });
  const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() {}, documentElement: { setAttribute() {} }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, navigator: {}, window: {}, requestAnimationFrame() {}, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {}, addEventListener() {}, removeEventListener() {}, alert() {}, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () {}, CustomEvent: function () {}, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() {} }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
  sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(s + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: p, timeout: 30000 });
  return sb.__api;
}
const EPPU = 516 / 13;
const API = loadApi('gunbound_calculator.html');
function solve(side, n, d, el) {
  const all = API.searchTrico3in1Physics(d, 20, side, 0, 0, el * EPPU) || [];
  const r = all.find(x => x.spinN === n);
  return r ? { a: r.angle, p: r.power, src: (r.centerResult && r.centerResult.source) || r.source } : null;
}
console.log('== 无风 落差扫描 (0 → 1.0, 步0.25) ==');
for (const [side, n, d] of [['right', 3, 40], ['right', 3, 20], ['right', 2, 30], ['right', 4, 30], ['left', 3, 30], ['left', 2, 25]]) {
  console.log(`-- ${side} N${n} d=${d} --`);
  let prev = null;
  for (const el of [0, 0.25, 0.5, 0.75, 1.0]) {
    const r = solve(side, n, d, el);
    const jump = (prev && r) ? ` |Δ角=${(r.a - prev.a).toFixed(2)} Δ力=${(r.p - prev.p).toFixed(3)}` : '';
    console.log(`  el=${el}: ${r ? r.a.toFixed(2) + '/' + r.p.toFixed(4) + ' [' + r.src + ']' : '无解'}${jump}`);
    prev = r;
  }
}
// 67实测中 ws=0 且 elev≠0 的行(改动影响面)
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const hit = data.filter(x => (+x.windStrength || 0) === 0 && Math.abs(+x.elevation || 0) > 0.001);
console.log('\n67实测中 ws=0 且 elev!=0 的行:', hit.length);
for (const h of hit) console.log(' ', h.side, 'N' + h.n, 'd=' + h.distance, 'elev=' + h.elevation, '实测', h.angle + '/' + h.power);
