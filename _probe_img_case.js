// Reproduce the image case: right attack, distance 20, wind 338, strength 26, elevation 0
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
const exposure = `;globalThis.__api = { searchTrico3in1Physics, EXCEL_TRICO, TRICO, TRICO_NEW };`;
vm.runInContext(scriptBody + exposure, sandbox, { filename: 'calc.js' });
const api = sandbox.__api;

const ELEVATION_PIXELS_PER_UNIT = 516/13;
const sdParts = 20;
// Image: distance 20, wind 338, strength 26, right attack, elevation 0
const distance = 20, windAngle = 338, windStrength = 26, elev = 0;
const dir = 'right';
const effWa = windAngle; // right: as-is
const elevInternal = elev * ELEVATION_PIXELS_PER_UNIT;
const all = api.searchTrico3in1Physics(distance, sdParts, dir, effWa, windStrength, elevInternal);
console.log('distance=20 windAngle=338 windStrength=26 elev=0 RIGHT');
for (const r of all||[]) {
    console.log(`  n=${r.spinN} angle=${r.angle.toFixed(2)} power=${r.power.toFixed(4)} T=${r.T.toFixed(2)} src=${r.source}`);
}
const n3 = (all||[]).find(r=>r.spinN===3);
console.log('\nN3 detail:', JSON.stringify(n3, null, 2));
