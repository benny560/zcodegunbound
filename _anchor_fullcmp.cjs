// 前后对比: 加载 backup(改前) 与 current(改后), 跑全量实测, diff 每条结果.
// 目的: 证明改动仅影响 right:3 正射, 其它 N/方向/背射零变化.
// 用法: node _anchor_fullcmp.cjs
const fs = require('fs');
const vm = require('vm');

function loadApi(htmlPath){
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptBody = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const fakeEl = () => ({
    value:'', textContent:'', style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){},
    querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;},
    getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},drawImage(){}};},
    options:[], children:[], innerHTML:'', checked:false, parentElement:null, focus(){}, blur(){}, click(){}, scrollIntoView(){},
  });
  const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement:{setAttribute(){}}, visibilityState:'visible' };
  const sandbox = {
    document: documentStub, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, navigator:{}, window:{},
    requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval:()=>0, clearInterval:()=>{}, addEventListener(){}, removeEventListener(){},
    alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI:Math.PI,
    Event:function(){}, CustomEvent:function(){}, getComputedStyle(){return {getPropertyValue(){return '';}};}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth:1280, innerHeight:800, devicePixelRatio:1, location:{href:'',search:''},
  };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(scriptBody + ';globalThis.__api={searchTrico3in1Physics,ELEVATION_PIXELS_PER_UNIT:(typeof ELEVATION_PIXELS_PER_UNIT!=="undefined"?ELEVATION_PIXELS_PER_UNIT:(516/13))};', sandbox, {filename:htmlPath, timeout:30000});
  return sandbox.__api;
}

const before = loadApi('gunbound_calculator.before_right3_anchor.html');
const after  = loadApi('gunbound_calculator.html');
const EPPU = before.ELEVATION_PIXELS_PER_UNIT || (516/13);
const data = JSON.parse(fs.readFileSync('_real_v1.json','utf8'));

function run(api, d){
  const dir = d.side === '右' ? 'right' : 'left';
  const wa = dir === 'left' ? ((180 - d.windAngle) % 360 + 360) % 360 : d.windAngle;
  const elev = (d.elevation || 0) * EPPU;
  const all = api.searchTrico3in1Physics(d.distance, 20, dir, wa, d.windStrength, elev);
  return (all||[]).find(r => r.spinN === d.n) || null;
}

let changed = 0, unchanged = 0, both_null = 0;
const changes = [];
let maeA_b=0,maeP_b=0,maeA_a=0,maeP_a=0,nStat=0;
for (const d of data){
  const rb = run(before, d), ra = run(after, d);
  const ab = rb?rb.angle:null, pb = rb?rb.power:null;
  const aa = ra?ra.angle:null, pa = ra?ra.power:null;
  // full-dataset MAE (raw) for both versions
  if (rb){ maeA_b+=Math.abs(ab-d.angle); maeP_b+=Math.abs(pb-d.power); }
  if (ra){ maeA_a+=Math.abs(aa-d.angle); maeP_a+=Math.abs(pa-d.power); nStat++; }
  if (rb===null && ra===null){ both_null++; continue; }
  const same = rb && ra && Math.abs(ab-aa)<1e-6 && Math.abs(pb-pa)<1e-6;
  if (same){ unchanged++; }
  else {
    changed++;
    changes.push({dist:d.distance, side:d.side, n:d.n, elev:d.elevation, ws:d.windStrength,
      before: rb?`${ab.toFixed(2)}/${pb.toFixed(3)}`:'NULL', after: ra?`${aa.toFixed(2)}/${pa.toFixed(3)}`:'NULL'});
  }
}
console.log(`总样本 ${data.length}: 变化 ${changed}, 不变 ${unchanged}, 双NULL ${both_null}`);
console.log('\n=== 发生变化的样本 (应全部是 side=右 & n=3 & dist>0) ===');
console.log('dist    side n  elev   ws | before(A/P)    -> after(A/P)');
for (const c of changes){
  const flag = (c.side==='右' && c.n===3 && c.dist>0) ? '' : '  <<< 意外!';
  console.log(`${String(c.dist).padStart(6)}  ${c.side}  ${c.n} ${String(c.elev).padStart(5)} ${String(c.ws).padStart(3)} | ${c.before.padEnd(13)} -> ${c.after}${flag}`);
}
const allExpected = changes.every(c => c.side==='右' && c.n===3 && c.dist>0);
console.log('\n所有变化都在 right:3 正射范围内:', allExpected ? '✓ 是' : '✗ 否(有意外波及!)');
console.log(`\n全量MAE(raw, ${nStat}条): 改前 角度=${(maeA_b/nStat).toFixed(4)} 力度=${(maeP_b/nStat).toFixed(4)} | 改后 角度=${(maeA_a/nStat).toFixed(4)} 力度=${(maeP_a/nStat).toFixed(4)}`);
