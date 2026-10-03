// Full analysis: all N (1-4), both sides, forward + backshot
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('gunbound_calculator.html', 'utf8');
const scriptBody = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({
    value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
    setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){},
    querySelectorAll(){return [];}, querySelector(){return fakeEl();},
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;},
    getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [],
    innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){},
});
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = {
    document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {},
    requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>{},
    addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console,
    Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean,
    Event: function(){}, CustomEvent: function(){},
    getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''},
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const exposure = `;globalThis.__api = { searchTrico3in1Physics, EXCEL_TRICO, TRICO };`;
vm.runInContext(scriptBody + exposure, sandbox, { filename: 'calc.js' });
const api = sandbox.__api;

const ELEV = 516/13;
const sdParts = 20;
const data = JSON.parse(fs.readFileSync('_real.json','utf8'));

const rows = [];
for (const d of data) {
    const dir = d.side === '右' ? 'right' : 'left';
    const elevInternal = (d.elevation || 0) * ELEV;
    const effWa = dir === 'left' ? ((180 - d.windAngle) % 360 + 360) % 360 : d.windAngle;
    const all = api.searchTrico3in1Physics(d.distance, sdParts, dir, effWa, d.windStrength, elevInternal);
    const res = (all||[]).find(r => r.spinN === d.n) || null;
    if (!res) {
        rows.push({ d, dir, effWa, n:d.n, err:'NULL' });
        continue;
    }
    const wr = effWa * Math.PI/180;
    const wx = Math.cos(wr) * d.windStrength;
    const wy = Math.sin(wr) * d.windStrength;
    rows.push({
        d, dir, n: d.n, effWa,
        realA: d.angle, realP: d.power,
        predA: res.angle, predP: res.power, predT: res.T, src: res.source,
        dA: res.angle - d.angle, dP: res.power - d.power,
        wx, wy, ws: d.windStrength, elev: d.elevation, sd: d.distance,
        backshot: d.distance < 0,
    });
}

function summarise(label, arr) {
    if (!arr.length) { console.log(`${label}: no data`); return; }
    const dA = arr.map(r=>r.dA), dP = arr.map(r=>r.dP);
    const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
    const mae = a => a.map(Math.abs).reduce((x,y)=>x+y,0)/a.length;
    const sd = a => Math.sqrt(a.reduce((s,v)=>s+(v-mean(a))**2,0)/a.length);
    const maxabs = (a)=>Math.max(...a.map(Math.abs));
    console.log(`${label.padEnd(22)} n=${String(arr.length).padStart(2)} | dA: mean=${mean(dA).toFixed(2).padStart(6)} MAE=${mae(dA).toFixed(2).padStart(5)} max=${maxabs(dA).toFixed(2).padStart(5)} | dP: mean=${mean(dP).toFixed(3).padStart(7)} MAE=${mae(dP).toFixed(3).toFixed ? mae(dP).toFixed(3):''}`);
}
function summarise2(label, arr) {
    if (!arr.length) { console.log(`${label}: no data`); return; }
    const mean = a => a.reduce((x,y)=>x+y,0)/a.length;
    const mae = a => a.map(Math.abs).reduce((x,y)=>x+y,0)/a.length;
    const maxabs = (a)=>Math.max(...a.map(Math.abs));
    const dA = arr.map(r=>r.dA), dP = arr.map(r=>r.dP);
    console.log(`${label.padEnd(24)} n=${String(arr.length).padStart(2)} | dA mean=${(mean(dA)>=0?'+':'')+mean(dA).toFixed(2)} MAE=${mae(dA).toFixed(2)} max|dA|=${maxabs(dA).toFixed(2)} | dP mean=${(mean(dP)>=0?'+':'')+mean(dP).toFixed(3)} MAE=${mae(dP).toFixed(3)} max|dP|=${maxabs(dP).toFixed(3)}`);
}

console.log('============================================');
console.log('  TRICO 3in1 ALL-N ANALYSIS (实测 vs 计算)');
console.log('============================================');
const ok = rows.filter(r=>!r.err);
const nullRows = rows.filter(r=>r.err);
console.log('Total samples:', data.length, '| solved:', ok.length, '| NULL:', nullRows.length);
if (nullRows.length) {
    console.log('NULL samples (no prediction):');
    for (const r of nullRows) console.log(`  ${r.d.side} N${r.n} sd=${r.d.distance} elev=${r.d.elevation} wa=${r.d.windAngle} ws=${r.d.windStrength} realA=${r.d.angle} realP=${r.d.power}`);
}

console.log('\n===== BY (side, N) — 正向射击 =====');
for (const dir of ['right','left']) {
    for (const n of [1,2,3,4]) {
        summarise2(`${dir} N${n} fwd`, ok.filter(r=>r.dir===dir && r.n===n && !r.backshot));
    }
}
console.log('\n===== BY (side, N) — 背射 (distance<0) =====');
for (const dir of ['right','left']) {
    for (const n of [1,2,3,4]) {
        summarise2(`${dir} N${n} back`, ok.filter(r=>r.dir===dir && r.n===n && r.backshot));
    }
}

console.log('\n===== TOTAL by N (forward only) =====');
for (const n of [1,2,3,4]) summarise2(`N${n} all fwd`, ok.filter(r=>r.n===n && !r.backshot));

console.log('\n===== BY WIND STRENGTH (forward) =====');
for (const [lo,hi,lbl] of [[0,9,'low 0-9'],[10,15,'mid 10-15'],[16,20,'high 16-20'],[21,99,'vhigh 21+']]) {
    summarise2(lbl, ok.filter(r=>!r.backshot && r.ws>=lo && r.ws<=hi));
}

console.log('\n===== BY ELEVATION (forward) =====');
summarise2('flat |e|<1', ok.filter(r=>!r.backshot && Math.abs(r.elev)<1));
summarise2('high target e>=1', ok.filter(r=>!r.backshot && r.elev>=1));
summarise2('low target e<=-1', ok.filter(r=>!r.backshot && r.elev<=-1));

console.log('\n===== BY WIND HORIZONTAL (shot frame, forward) =====');
summarise2('tailwind wx>0', ok.filter(r=>!r.backshot && r.wx>1));
summarise2('headwind wx<0', ok.filter(r=>!r.backshot && r.wx<-1));

console.log('\n===== BY DISTANCE |sd| (forward) =====');
for (const [lo,hi,lbl] of [[0,8,'short 0-8'],[8,16,'med 8-16'],[16,25,'long 16-25'],[25,99,'vlong 25+']]) {
    summarise2(lbl, ok.filter(r=>!r.backshot && Math.abs(r.sd)>=lo && Math.abs(r.sd)<hi));
}

// Correlations per N
function corr(xs, ys) {
    if (xs.length<3) return NaN;
    const mx = xs.reduce((a,b)=>a+b,0)/xs.length, my = ys.reduce((a,b)=>a+b,0)/ys.length;
    let num=0, dx=0, dy=0;
    for (let i=0;i<xs.length;i++){ num+=(xs[i]-mx)*(ys[i]-my); dx+=(xs[i]-mx)**2; dy+=(ys[i]-my)**2; }
    return dx&&dy ? num/Math.sqrt(dx*dy) : NaN;
}
console.log('\n===== CORRELATIONS per N (forward) =====');
console.log('  N  n | dA~elev dA~ws  dA~wx  dA~wy  dP~elev | power real/pred');
const fwd = ok.filter(r=>!r.backshot);
for (const n of [1,2,3,4]) {
    const a = fwd.filter(r=>r.n===n);
    if (a.length<3) { console.log(`  N${n}  ${a.length} (too few)`); continue; }
    const dA=a.map(r=>r.dA), dP=a.map(r=>r.dP);
    const ratios = a.map(r=>r.realP/r.predP).filter(isFinite);
    const rmean = ratios.length ? ratios.reduce((x,y)=>x+y,0)/ratios.length : NaN;
    console.log(`  N${n} ${String(a.length).padStart(2)} | ${corr(dA,a.map(r=>r.elev)).toFixed(2).padStart(6)} ${corr(dA,a.map(r=>r.ws)).toFixed(2).padStart(5)} ${corr(dA,a.map(r=>r.wx)).toFixed(2).padStart(5)} ${corr(dA,a.map(r=>r.wy)).toFixed(2).padStart(5)} ${corr(dP,a.map(r=>r.elev)).toFixed(2).padStart(7)} | ${rmean.toFixed(4)}`);
}

// Worst 12 by |dA|
console.log('\n===== WORST 12 BY |dA| =====');
const sorted = ok.slice().sort((a,b)=>Math.abs(b.dA)-Math.abs(a.dA));
console.log('  sN sd     elev  wa   ws  wx     wy     | realA  predA   realP predP  | dA     dP     src');
for (const r of sorted.slice(0,12)) {
    console.log(`  ${r.dir[0].toUpperCase()}${r.n} ${String(r.sd).padStart(6)} ${String(r.elev).padStart(5)} ${String(r.d.windAngle).padStart(3)} ${String(r.ws).padStart(3)} ${r.wx.toFixed(1).padStart(6)} ${r.wy.toFixed(1).padStart(6)} | ${String(r.realA).padStart(5)} ${r.predA.toFixed(1).padStart(6)} ${r.realP.toFixed(2).padStart(6)} ${r.predP.toFixed(2).padStart(5)} | ${(r.dA>=0?'+':'')+r.dA.toFixed(2).padStart(5)} ${(r.dP>=0?'+':'')+r.dP.toFixed(3).padStart(6)} ${r.backshot?'BACK':''} ${r.src}`);
}

// Source distribution
console.log('\n===== SOLVER ROUTE USAGE =====');
const srcCount = {};
for (const r of ok) {
    const key = `${r.src}${r.backshot?'(back)':''}`;
    srcCount[key] = (srcCount[key]||0)+1;
}
for (const [k,v] of Object.entries(srcCount).sort((a,b)=>b[1]-a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);

// Power ratio summary per (side,N)
console.log('\n===== POWER RATIO (real/pred) per (side,N) =====');
for (const dir of ['right','left']) {
    for (const n of [1,2,3,4]) {
        const a = ok.filter(r=>r.dir===dir && r.n===n && !r.backshot);
        if (!a.length) continue;
        const ratios = a.map(r=>r.realP/r.predP).filter(isFinite);
        if (!ratios.length) continue;
        const mean = ratios.reduce((x,y)=>x+y,0)/ratios.length;
        console.log(`  ${dir} N${n}: power real/pred mean=${mean.toFixed(4)} (n=${a.length})`);
    }
}

fs.writeFileSync('_all_compare.json', JSON.stringify({rows: ok, nullRows}, null, 2));
console.log('\nSaved _all_compare.json (', ok.length, 'rows )');
