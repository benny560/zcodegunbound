// 验证 right:3 (左打右N3) 锚定改造前后的实测回归 + elev 连续性
// 用法: node _anchor_right3.cjs
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('gunbound_calculator.html', 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
const scriptBody = m[1];

const fakeEl = () => ({
  value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} },
  setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){},
  querySelectorAll(){return [];}, querySelector(){return fakeEl();},
  addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;},
  getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},drawImage(){}};}, options: [], children: [],
  innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){},
});
const documentStub = {
  getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];},
  createElement(){return fakeEl();}, addEventListener(){}, documentElement:{setAttribute(){}}, visibilityState:'visible',
};
const sandbox = {
  document: documentStub, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, navigator:{}, window:{},
  requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval:()=>0, clearInterval:()=>{},
  addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;},
  console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI: Math.PI,
  Event:function(){}, CustomEvent:function(){}, getComputedStyle(){return {getPropertyValue(){return '';}};},
  matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth:1280, innerHeight:800, devicePixelRatio:1, location:{href:'',search:''},
};
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
const exposure = `;globalThis.__api = { searchTrico3in1Physics, EXCEL_TRICO, ELEVATION_PIXELS_PER_UNIT: (typeof ELEVATION_PIXELS_PER_UNIT!=='undefined'?ELEVATION_PIXELS_PER_UNIT:(516/13)) };`;
try { vm.runInContext(scriptBody + exposure, sandbox, {filename:'calc.js', timeout:30000}); }
catch(e){ console.error('load error:', e.message); process.exit(1); }
const api = sandbox.__api;
const EPPU = api.ELEVATION_PIXELS_PER_UNIT || (516/13);
const sdParts = 20;

function callN3(dist, elevUI, wa, ws){
  const all = api.searchTrico3in1Physics(dist, sdParts, 'right', wa, ws, (elevUI||0)*EPPU);
  return (all||[]).find(r=>r.spinN===3) || null;
}

// ---- 1. 用户场景: dist=20, 右, N3, 无风, 不同落差 ----
console.log('=== 用户场景 dist=20 right N3 无风 ===');
for (const e of [0, -1, -2, 1]) {
  const r = callN3(20, e, 0, 0);
  console.log(`  elev=${String(e).padStart(2)}: ${r?`angle=${r.angle.toFixed(3)}  power=${r.power.toFixed(4)}  T=${(r.T||0).toFixed(3)}  [${r.source}]`:'NULL'}`);
}

// ---- 2. 全量 right:3 实测回归 ----
const data = JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const r3 = data.filter(d=>d.side==='右' && d.n===3);
console.log(`\n=== right:3 实测 ${r3.length} 条 (含背射) ===`);
console.log('dist    elev    wa   ws | realA realP | predA  predP  T     src              | dA     dP');
let fSumA=0,fSumP=0,fN=0; // forward only
for (const d of r3){
  const r = callN3(d.distance, d.elevation||0, d.windAngle, d.windStrength);
  if (!r){ console.log(`${String(d.distance).padStart(6)} ${String(d.elevation).padStart(6)} ${String(d.windAngle).padStart(4)} ${String(d.windStrength).padStart(3)} | ${String(d.angle).padStart(5)} ${d.power.toFixed(2).padStart(5)} | NULL`); continue; }
  const dA = r.angle - d.angle, dP = r.power - d.power;
  const back = d.distance < 0 ? ' (背射)' : '';
  console.log(`${String(d.distance).padStart(6)} ${String(d.elevation).padStart(6)} ${String(d.windAngle).padStart(4)} ${String(d.windStrength).padStart(3)} | ${String(d.angle).padStart(5)} ${d.power.toFixed(2).padStart(5)} | ${r.angle.toFixed(1).padStart(5)} ${r.power.toFixed(2).padStart(6)} ${(r.T||0).toFixed(2).padStart(5)} ${(r.source||'').padEnd(16)} | ${dA>=0?'+':''}${dA.toFixed(2).padStart(5)} ${dP>=0?'+':''}${dP.toFixed(3)}${back}`);
  if (d.distance > 0){ fSumA+=Math.abs(dA); fSumP+=Math.abs(dP); fN++; }
}
console.log(`\n正射 ${fN} 条: MAE 角度=${(fSumA/fN).toFixed(3)}°  力度=${(fSumP/fN).toFixed(4)}`);
