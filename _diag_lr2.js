// 正确复现UI调用: 左攻 windAngle 要先经过 getEffectiveWindAngle 转换
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];
let sbB=sb.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1) return null;');
sbB=sbB.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1) return null;');
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sbB+';globalThis.__api={EXCEL_TRICO};',sandbox,{filename:'c.js'});
const EX = sandbox.__api.EXCEL_TRICO;
const EP=516/13;

// 模拟 getEffectiveWindAngle: 左攻 180-wa
const effWa = (side, wa) => side==='左'? ((180-wa)%360+360)%360 : wa;

console.log('=== 用正确的射击坐标系windAngle重测 ===');
console.log('样本 | 原wa -> effWa | solver结果');
const tests=[
  {side:'右',distance:3.27,windAngle:170,windStrength:24,elevation:0,n:3,angle:74,power:3.76},
  {side:'左',distance:3,windAngle:12,windStrength:26,elevation:-0.5,n:3,angle:72,power:3.10},
  {side:'左',distance:9.24,windAngle:18,windStrength:25,elevation:-1.18,n:3,angle:67,power:3.19},
];
for(const d of tests){
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const elevInt=(d.elevation||0)*EP;
  const res=EX.calcWithWind(20,dir,d.n,d.distance,elevInt,wa,d.windStrength);
  console.log(`${d.side}${d.n} sd=${d.distance} wa=${d.windAngle}->${wa} ws=${d.windStrength} (实测${d.angle}/${d.power}) | ${res?res.angle.toFixed(1)+'/'+res.power.toFixed(2)+' ['+res.source+']':'NULL'}`);
}
