// 列出 v1.65 67条回归中 >2° 的离群样本详情
const fs = require('fs'), vm = require('vm');
const src = fs.readFileSync('gunbound_calculator.html', 'utf8');
const js = src.match(/<script>([\s\S]*?)<\/script>/)[1];
const fe = () => ({ value: '', textContent: '', style: {}, classList: { add() { }, remove() { }, toggle() { }, contains() { return false; } }, setAttribute() { }, getAttribute() { return null; }, appendChild() { }, removeChild() { }, querySelectorAll() { return []; }, querySelector() { return fe(); }, addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true; }, getContext() { return { scale() { }, translate() { }, save() { }, restore() { }, clearRect() { }, beginPath() { }, moveTo() { }, lineTo() { }, arc() { }, fill() { }, stroke() { }, fillText() { }, fillRect() { }, strokeRect() { }, rect() { }, closePath() { }, setTransform() { }, measureText() { return { width: 0 }; }, createLinearGradient() { return { addColorStop() { } }; }, setLineDash() { }, drawImage() { } }; }, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus() { }, blur() { }, click() { }, scrollIntoView() { } });
const sb = { document: { getElementById() { return fe(); }, querySelector() { return fe(); }, querySelectorAll() { return []; }, createElement() { return fe(); }, addEventListener() { }, documentElement: { setAttribute() { } }, visibilityState: 'visible' }, localStorage: { getItem() { return null; }, setItem() { }, removeItem() { } }, navigator: {}, window: {}, requestAnimationFrame() { }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => { }, addEventListener() { }, removeEventListener() { }, alert() { }, prompt() { return null; }, confirm() { return false; }, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI, Event: function () { }, CustomEvent: function () { }, getComputedStyle() { return { getPropertyValue() { return ''; } }; }, matchMedia() { return { matches: false, addEventListener() { } }; }, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: { href: '', search: '' } };
sb.window = sb; sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(js + ';globalThis.__api={searchTrico3in1Physics};', sb, { filename: 'g.html', timeout: 30000 });
const api = sb.__api;
const EPPU = 516 / 13;
const data = JSON.parse(fs.readFileSync('_excel_real.json', 'utf8'));
const eff = d => d.side === '左' ? (((180 - d.windAngle) % 360) + 360) % 360 : d.windAngle;
const sk = d => d.side === '右' ? 'right' : 'left';
const out = [];
for (const d of data) {
    const all = api.searchTrico3in1Physics(d.distance, 20, sk(d), eff(d), d.windStrength, (d.elevation || 0) * EPPU) || [];
    const r = all.find(x => x.spinN === d.n);
    if (!r) continue;
    const dA = r.angle - d.angle, dP = r.power - d.power;
    if (Math.abs(dA) > 2) out.push({ d, r, dA, dP });
}
console.log('>2° 离群样本 (' + out.length + ' 条):');
for (const o of out) {
    console.log(`  ${o.d.side} N${o.d.n} dist=${o.d.distance} elev=${o.d.elevation || 0} wa=${o.d.windAngle} ws=${o.d.windStrength} | 实测 ${o.d.angle}°/${o.d.power} | 预测 ${o.r.angle.toFixed(1)}°/${o.r.power.toFixed(3)} | Δ=${o.dA >= 0 ? '+' : ''}${o.dA.toFixed(2)}°/${o.dP >= 0 ? '+' : ''}${o.dP.toFixed(3)} | src=${o.r.source || '?'}`);
}
