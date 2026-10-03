// 测试 right:4 新系数 5.1541-0.00462·sd
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
let sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
sb=sb.replace("'right:4': {a: 5.1551, b: -0.00594}","'right:4': {a: 5.1541, b: -0.00462}");
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics};',sandbox,{filename:'c.js'});
const api=sandbox.__api;
// 用新4个标准数据点验证
console.log('=== right:4 新系数 vs 新标准数据(wa=90纯上风) ===');
console.log('sd   ws | 实测A/实测P    | 新pred A/P          err');
const tests=[
  {sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97},
];
let mA=0,mP=0;
for(const t of tests){
  const all=api.searchTrico3in1Physics(t.sd,20,'right',90,t.ws,0);
  const r=all.find(x=>x.spinN===4);
  const eA=r.angle-t.a,eP=r.power-t.p;
  mA+=Math.abs(eA);mP+=Math.abs(eP);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p}  | ${r.angle.toFixed(1)}/${r.power.toFixed(2)}  ${(eA>=0?'+':'')+eA.toFixed(1)}°/${(eP>=0?'+':'')+eP.toFixed(2)}`);
}
console.log(`MAE: dA=${(mA/4).toFixed(2)}° dP=${(mP/4).toFixed(3)}`);
// 也验证旧2样本
console.log('\n=== 旧2样本(wa=79 ws=24) ===');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
for(const d of data.filter(x=>x.n===4&&x.side==='右'&&x.distance>=0)){
  const all=api.searchTrico3in1Physics(d.distance,20,'right',d.windAngle,d.windStrength,(d.elevation||0)*(516/13));
  const r=all.find(x=>x.spinN===4);
  console.log(`sd=${d.distance} ws=${d.windStrength} 实测${d.angle}/${d.power} -> pred${r.angle.toFixed(1)}/${r.power.toFixed(2)}`);
}
