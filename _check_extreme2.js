// 核实极端解是不是病态: 检查落点和数值健康
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={EXCEL_TRICO};',sandbox,{filename:'c.js'});
const EX = sandbox.__api.EXCEL_TRICO;
// 核实几个: 89.9度的, power>4.9的
const checks=[
  ['rightN1 d=3 wa=315 ws=22', 1,'right',3,315,22,0],
  ['rightN3 d=18 wa=0 ws=22',  3,'right',18,0,22,0],
  ['rightN3 d=13 wa=45 ws=22',  3,'right',13,45,22,0],
  ['rightN3 d=8 wa=270 ws=26',  3,'right',8,270,26,0],
];
console.log('核实极端解的数值健康(看落点xErr和cosA):');
for(const [lbl,n,side,d,wa,ws,e] of checks){
  const r=EX.calcWithWind(20,side,n,d,e*(516/13),wa,ws);
  if(!r){console.log(`${lbl}: NULL`);continue;}
  const cosA=Math.cos(r.angle*Math.PI/180);
  console.log(`${lbl}: ${r.angle.toFixed(2)}/${r.power.toFixed(3)} cosA=${cosA.toFixed(4)} T=${r.time?.toFixed(2)} src=${r.source}`);
  console.log(`   -> cosA很小(${cosA.toFixed(4)})说明贴近垂直, 力度${r.power.toFixed(2)}是否合理?`);
}
console.log('\n说明: 89.x度是顺风近距离的高抛解, cosA小但power合理(没爆). 这是物理上"尽量高抛减小vx抵消顺风"的正确解.');
console.log('v1.05之前这些会被>89截断成NULL, 现在能给出解了.');
