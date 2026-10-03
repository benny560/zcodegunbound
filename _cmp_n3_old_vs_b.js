// N3: 旧法(落点守恒+v1.07) vs 方向B(v5) 详细对比
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
console.log('N3 旧法(v1.07) 逐样本:');
let sA=0,sP=0,n=0;
for(const d of data){
  if(d.n!==3||d.distance<0)continue;
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const all=api.searchTrico3in1Physics(d.distance,20,dir,wa,d.windStrength,(d.elevation||0)*EP);
  const r=all.find(x=>x.spinN===3);
  if(r){n++;sA+=Math.abs(r.angle-d.angle);sP+=Math.abs(r.power-d.power);
    if(Math.abs(r.angle-d.angle)>1.5) console.log(`  ${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}: pred${r.angle.toFixed(1)}/${r.power.toFixed(2)} real${d.angle}/${d.power} dA${(r.angle-d.angle).toFixed(1)}`);
  }
}
console.log(`N3旧法: dA_MAE=${(sA/n).toFixed(2)} dP_MAE=${(sP/n).toFixed(3)}`);
