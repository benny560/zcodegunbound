const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
sandbox.window=sandbox;sandbox.self=sandbox;sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(sb+';globalThis.__api={EXCEL_TRICO};',sandbox,{filename:'c.js'});
const EX = sandbox.__api.EXCEL_TRICO;

// calcWithWind 内部顺序: timeSolver -> (非backshot)rederived -> (N4)...
// 问题是: timeSolver返回null时, rederived也null, 就彻底没解了
// 看 rederived 内部哪步失败
// calcRederivedPhasePhysicsN123 需要 buildEmpiricalPhaseModel
const model = EX.buildEmpiricalPhaseModel(20,'right',3,20);
console.log('buildEmpiricalPhaseModel:', model? 'OK sd='+model.sd+' targetTime='+model.targetTime?.toFixed(3) : 'NULL');
if(model){
  // getEmpiricalWindParams
  const wp = EX.getEmpiricalWindParams(338, 26, model.formulaGPhase);
  console.log('getEmpiricalWindParams:', wp? 'effGrav='+wp.effGrav.toFixed(1)+' xA='+wp.xA?.toFixed(2) : 'NULL');
  // rederived feature
  const grp = EX.rederivedPhasePhysicsN123.groups['right:3'];
  console.log('rederived group right:3:', grp? 'OK' : 'NULL —— 没有N3重推系数组!');
}
