// 诊断: dist=19.8 elev=-5.5 wind118/16 右攻(side=right) 各N显示解的实际落点
// 对比 改前(backup) vs 改后(current), 隔离 right:3 锚定对落点的影响
// 用法: node _diag_right_land.cjs
const fs = require('fs');
const vm = require('vm');

function loadApi(htmlPath){
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scriptBody = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const fakeEl = () => ({ value:'', textContent:'', style:{}, classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();},
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;},
    getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},drawImage(){}};},
    options:[], children:[], innerHTML:'', checked:false, parentElement:null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
  const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement:{setAttribute(){}}, visibilityState:'visible' };
  const sandbox = { document: documentStub, localStorage:{getItem(){return null;},setItem(){},removeItem(){}}, navigator:{}, window:{},
    requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval:()=>0, clearInterval:()=>{}, addEventListener(){}, removeEventListener(){},
    alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, PI:Math.PI,
    Event:function(){}, CustomEvent:function(){}, getComputedStyle(){return {getPropertyValue(){return '';}};}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth:1280, innerHeight:800, devicePixelRatio:1, location:{href:'',search:''} };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(scriptBody + ';globalThis.__api={searchTrico3in1Physics,ELEVATION_PIXELS_PER_UNIT:(typeof ELEVATION_PIXELS_PER_UNIT!=="undefined"?ELEVATION_PIXELS_PER_UNIT:(516/13))};', sandbox, {filename:htmlPath, timeout:30000});
  return sandbox.__api;
}

const PF = 0.004332712;
const sdParts = 20;
const dist = 19.8, elevUI = -5.5, wa = 118, ws = 16;   // 右攻: 不翻转风向
const EPPU = 516/13;
const xDist = dist * (800/sdParts);      // 目标水平(px)
const elevInternal = elevUI * EPPU;      // 目标落差(px)

function landing(r){
  // 用"显示解"(anchored angle/power)在含风抛物线下算实际落点
  const c = r.centerResult;
  const V = r.power / PF;
  const a = r.angle * Math.PI/180;
  const T = c.time, xA = c.xA, g = c.effectiveGravity;
  const xLand = V*Math.cos(a)*T + 0.5*xA*T*T;
  const yLand = V*Math.sin(a)*T - 0.5*g*T*T;
  return { xLand, yLand, T, xA, g, xErrSD: (xLand - xDist)/40, yErrUI: (yLand - elevInternal)/EPPU };
}

function report(tag, api){
  console.log(`\n===== ${tag} (dist=${dist} elev=${elevUI} wind=${wa}/${ws} 右攻) 目标xDist=${xDist}px(=${dist}sd) =====`);
  const all = api.searchTrico3in1Physics(dist, sdParts, 'right', wa, ws, elevInternal);
  console.log('N | angle   power  | T     xA      effG   | xLand(px) 水平误差SD | y误差(UI落差) | src');
  for (const n of [2,3,4]){
    const r = (all||[]).find(x=>x.spinN===n);
    if (!r){ console.log(`${n} | (无解)`); continue; }
    const L = landing(r);
    console.log(`${n} | ${r.angle.toFixed(2).padStart(6)} ${r.power.toFixed(4).padStart(6)} | ${L.T.toFixed(2)} ${L.xA.toFixed(3).padStart(7)} ${L.g.toFixed(1)} | ${L.xLand.toFixed(0).padStart(6)}   ${(L.xErrSD>=0?'+':'')+L.xErrSD.toFixed(2)} SD | ${(L.yErrUI>=0?'+':'')+L.yErrUI.toFixed(2)} | ${r.source}`);
  }
}

report('改前 backup', loadApi('gunbound_calculator.before_right3_anchor.html'));
report('改后 current', loadApi('gunbound_calculator.html'));
