// Harness: load the actual calculator script with minimal stubs,
// then drive searchTrico3in1Physics against measured N3 data.
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('gunbound_calculator.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const scriptBody = m[1];

// Minimal DOM/browser stubs
const fakeEl = () => ({
    value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
    setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){},
    querySelectorAll(){return [];}, querySelector(){return fakeEl();},
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;},
    getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [],
    innerHTML: '', checked: false, parentElement: null,
    focus(){}, blur(){}, click(){}, scrollIntoView(){},
});
const documentStub = {
    getElementById() { return fakeEl(); },
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
    createElement() { return fakeEl(); },
    addEventListener() {},
    documentElement: { setAttribute(){} },
    visibilityState: 'visible',
};
const sandbox = {
    document: documentStub,
    localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    navigator: {},
    window: {},
    requestAnimationFrame() {},
    setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>{},
    addEventListener(){}, removeEventListener(){},
    alert(){}, prompt(){return null;}, confirm(){return false;},
    console,
    Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean,
    PI: Math.PI,
    Event: function(){}, CustomEvent: function(){},
    getComputedStyle(){return { getPropertyValue(){return '';} };},
    matchMedia(){return {matches:false, addEventListener(){}};},
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    location: {href:'', search:''},
};
sandbox.window = sandbox;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.addEventListener = () => {};
sandbox.removeEventListener = () => {};
sandbox.requestAnimationFrame = () => {};
vm.createContext(sandbox);

// Wrap in IIFE-scoped eval but expose needed symbols.
// The script declares consts at top-level of the <script> (module-ish global scope).
// In vm run, top-level const becomes local to the context's global? Actually top-level
// const/let in vm script are NOT added as globals. We need var-like exposure.
// Strategy: append exposure code.
const exposure = `
;globalThis.__api = {
  searchTrico3in1Physics,
  EXCEL_TRICO,
  TRICO,
  TRICO_NEW,
  roundAngleForTrico: (typeof roundAngleForTrico === 'function') ? roundAngleForTrico : null,
  getEffectiveWindAngle: (typeof getEffectiveWindAngle === 'function') ? getEffectiveWindAngle : null,
};
`;
const full = scriptBody + exposure;

// Suppress the wakeLock IIFE async error by stubbing it via try/catch wrapper.
try {
    vm.runInContext(full, sandbox, { filename: 'calc.js', timeout: 30000 });
} catch (e) {
    console.error('Script load error:', e.message);
}

if (!sandbox.__api) {
    console.error('FAILED to load API');
    process.exit(1);
}

const api = sandbox.__api;
console.log('API loaded. EXCEL_TRICO keys:', Object.keys(api.EXCEL_TRICO).filter(k=>typeof api.EXCEL_TRICO[k]==='function').slice(0,8));

// Now load measured N3 data
const data = JSON.parse(fs.readFileSync('_real.json','utf8'));
const n3 = data.filter(d => d.n === 3);
console.log('N3 samples:', n3.length, 'right:', n3.filter(d=>d.side==='右').length, 'left:', n3.filter(d=>d.side==='左').length);

// Inputs the calculator uses:
// distance (in "距离" units, where 1屏=8? Actually sdParts default=20 -> 1 unit = ?)
// The measured distance column header is "距离" which the UI takes as distance in screen-distance units.
// elevation: header "落差" in elevation UI units? Calculator takes elevationInternal (pixels). UI input落差 maps via ELEVATION_PIXELS_PER_UNIT.
// We need to determine units. Let's check how UI feeds these.
// From RULES/calc: distance is in "距离" units (1单位=?). sdParts=20 default.
// Let's just pass: distance=d, elevationInternal=elev*ELEVATION_PIXELS_PER_UNIT? Actually measured "落差" likely in same unit as UI落差 input.
// We'll test both. First try: elevation as-is (treat measured elev unit = UI unit).

const ELEVATION_PIXELS_PER_UNIT = sandbox.ELEVATION_PIXELS_PER_UNIT || (516/13);
const sdParts = 20;

function sideToDir(s){ return s==='右' ? 'right' : 'left'; }

// getEffectiveWindAngle reads lexical globals we cannot easily set from outside.
// Replicate its logic: left shot -> 180-wa, right shot -> wa.
const results = [];
for (const d of n3) {
    const dir = sideToDir(d.side);
    const elevInternal = (d.elevation || 0) * ELEVATION_PIXELS_PER_UNIT;
    // Effective wind angle: left shot flips horizontal component
    const wa = dir === 'left' ? ((180 - d.windAngle) % 360 + 360) % 360 : d.windAngle;
    let res = null, err = null;
    try {
        const all = api.searchTrico3in1Physics(d.distance, sdParts, dir, wa, d.windStrength, elevInternal);
        res = (all||[]).find(r => r.spinN === 3) || null;
    } catch(e) { err = e.message; }
    results.push({
        dist: d.distance, elev: d.elevation, wa: d.windAngle, effWa: wa, ws: d.windStrength,
        side: d.side, n: d.n,
        realAngle: d.angle, realPower: d.power,
        predAngle: res ? res.angle : null,
        predPower: res ? res.power : null,
        predT: res ? res.T : null,
        source: res ? res.source : null,
        err,
    });
}

// Print table
console.log('\n=== Right N3 (右, n=3) ===');
console.log('dist   elev   wa    ws  | realA realP  | predA  predP   predT  src             | dA    dP');
for (const r of results.filter(x=>x.side==='右')) {
    if (r.predAngle == null) {
        console.log(`${String(r.dist).padStart(5)} ${String(r.elev).padStart(5)} ${String(r.wa).padStart(4)} ${String(r.ws).padStart(3)} | ${String(r.realAngle).padStart(5)} ${r.realPower.toFixed(2).padStart(5)} | ERR ${r.err}`);
        continue;
    }
    const dA = r.predAngle - r.realAngle;
    const dP = r.predPower - r.realPower;
    console.log(`${String(r.dist).padStart(5)} ${String(r.elev).padStart(5)} ${String(r.wa).padStart(4)} ${String(r.ws).padStart(3)} | ${String(r.realAngle).padStart(5)} ${r.realPower.toFixed(2).padStart(5)} | ${r.predAngle.toFixed(1).padStart(5)} ${r.predPower.toFixed(2).padStart(6)} ${r.predT.toFixed(2).padStart(5)}  ${(r.source||'').padEnd(14)} | ${dA>=0?'+':''}${dA.toFixed(2)} ${dP>=0?'+':''}${dP.toFixed(3)}`);
}
console.log('\n=== Left N3 (左, n=3) ===');
console.log('dist   elev   wa    ws  | realA realP  | predA  predP   predT  src             | dA    dP');
for (const r of results.filter(x=>x.side==='左')) {
    if (r.predAngle == null) {
        console.log(`${String(r.dist).padStart(5)} ${String(r.elev).padStart(5)} ${String(r.wa).padStart(4)} ${String(r.ws).padStart(3)} | ${String(r.realAngle).padStart(5)} ${r.realPower.toFixed(2).padStart(5)} | ERR ${r.err}`);
        continue;
    }
    const dA = r.predAngle - r.realAngle;
    const dP = r.predPower - r.realPower;
    console.log(`${String(r.dist).padStart(5)} ${String(r.elev).padStart(5)} ${String(r.wa).padStart(4)} ${String(r.ws).padStart(3)} | ${String(r.realAngle).padStart(5)} ${r.realPower.toFixed(2).padStart(5)} | ${r.predAngle.toFixed(1).padStart(5)} ${r.predPower.toFixed(2).padStart(6)} ${r.predT.toFixed(2).padStart(5)}  ${(r.source||'').padEnd(14)} | ${dA>=0?'+':''}${dA.toFixed(2)} ${dP>=0?'+':''}${dP.toFixed(3)}`);
}

// Aggregate stats
function stats(arr, key) {
    const vals = arr.filter(r=>r.predAngle!=null).map(r=>r[key]);
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
    const abs = vals.map(Math.abs);
    const mae = abs.reduce((a,b)=>a+b,0)/abs.length;
    const sd = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
    return {mean, mae, sd, n:vals.length};
}
const rn3 = results.filter(r=>r.side==='右');
const ln3 = results.filter(r=>r.side==='左');
console.log('\n=== Stats (pred - real) ===');
console.log('Right N3 angle:', stats(rn3,'dA_tmp'||'__'));
// fix: compute directly
function st(arr, key){
    const vals = arr.filter(r=>r.predAngle!=null).map(r=>{
        return key==='dA' ? (r.predAngle - r.realAngle) : (r.predPower - r.realPower);
    });
    const mean = vals.reduce((a,b)=>a+b,0)/vals.length;
    const mae = vals.map(Math.abs).reduce((a,b)=>a+b,0)/vals.length;
    return {n:vals.length, mean:+mean.toFixed(3), mae:+mae.toFixed(3)};
}
console.log('Right N3 (n=12):', 'angle dA', st(rn3,'dA'), '| power dP', st(rn3,'dP'));
console.log('Left  N3 (n=15):', 'angle dA', st(ln3,'dA'), '| power dP', st(ln3,'dP'));

// Save raw for further analysis
fs.writeFileSync('_n3_compare.json', JSON.stringify(results, null, 2));
console.log('\nSaved _n3_compare.json');
