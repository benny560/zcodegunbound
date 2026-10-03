const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics};',sandbox,{filename:'c.js'});
const api=sandbox.__api;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13,effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
console.log('=== N4 left 全量逐样本(方向B vs 旧法) ===');
console.log('sd   wa_eff ws | 实测A/P    | 方向B A/P           | dA    dP');
for(const d of data){
  if(d.n!==4||d.side!=='左'||d.distance<0)continue;
  const wa=effWa(d.side,d.windAngle);
  const all=api.searchTrico3in1Physics(d.distance,20,'left',wa,d.windStrength,(d.elevation||0)*EP);
  const r=(all||[]).find(x=>x.spinN===4);
  if(!r){console.log(`${d.distance} NULL`);continue;}
  const dA=r.angle-d.angle, dP=r.power-d.power;
  const mark = Math.abs(dP)>0.1?' <<':'';
  console.log(`${String(d.distance).padStart(5)} ${String(wa).padStart(3)} ${String(d.windStrength).padStart(2)} | ${d.angle}/${d.power.toFixed(2)} | ${r.angle.toFixed(1)}/${r.power.toFixed(2)} | ${(dA>=0?'+':'')+dA.toFixed(1)} ${(dP>=0?'+':'')+dP.toFixed(2)}${mark}`);
}
