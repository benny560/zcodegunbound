// 版本A里这2个样本走哪条路径出87度的?
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];
let sbA=sb;
sbA=sbA.replace('const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;',
  'if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }\n                const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;');
sbA=sbA.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1 || angleRaw > 89) return null;');
sbA=sbA.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1 || angle > 89) return null;');
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sbA+';globalThis.__api={EXCEL_TRICO};',sandbox,{filename:'c.js'});
const EX = sandbox.__api.EXCEL_TRICO;
const EP=516/13;
for(const d of [{side:'左',distance:3,elevation:-0.5,windAngle:12,windStrength:26,n:3},
                {side:'左',distance:9.24,elevation:-1.18,windAngle:18,windStrength:25,n:3}]){
  const dir='left';const elevInt=(d.elevation||0)*EP;
  const ts=EX.calcTimePhysicsSolver(20,dir,d.n,d.distance,elevInt,d.windAngle,d.windStrength);
  const cw=EX.calcWithWind(20,dir,d.n,d.distance,elevInt,d.windAngle,d.windStrength);
  console.log(`N${d.n} ${d.side} sd=${d.distance}: timeSolver=${ts?ts.angle.toFixed(1)+'/'+ts.power.toFixed(2):'NULL'}  calcWithWind=${cw?cw.angle.toFixed(1)+'/'+cw.power.toFixed(2)+' ['+cw.source+']':'NULL'}`);
}
