// 红框场景: 右攻 距离5 落差-1 风向157 风力18. N3 取整解 76°/3.1956 和 77°/3.6366
// 检查: 这两个解的T是否一致? raw解是什么?
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics,EXCEL_TRICO};',sandbox,{filename:'c.js'});
const api=sandbox.__api;
const EP=516/13;
// 右攻 距离5 落差-1 风向157 风力18
const all=api.searchTrico3in1Physics(5,20,'right',157,18,-1*EP);
const n3=all.find(r=>r.spinN===3);
console.log('=== 红框场景 N3 (右 sd=5 wa=157 ws=18 elev=-1) ===');
console.log('raw解:', n3?`angle=${n3.angle.toFixed(4)} power=${n3.power.toFixed(4)} T=${n3.T.toFixed(4)}`:'NULL');
console.log('source:', n3?.source);
console.log('centerResult:', n3?JSON.stringify({angle:n3.centerResult.angle,powerRaw:n3.centerResult.powerRaw,time:n3.centerResult.time,angleRaw:n3.centerResult.angleRaw}):'');
console.log('');
// 看 N1 N2 的取整解连续性做对比
console.log('=== 各N的raw解对比 ===');
for(const r of all){
  console.log(`n=${r.spinN}: angle=${r.angle.toFixed(2)} power=${r.power.toFixed(4)} T=${r.T.toFixed(3)}`);
}
