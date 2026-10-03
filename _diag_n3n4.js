const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// reuse the proven stub from _test_n3_analysis.js
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics,EXCEL_TRICO};',sandbox,{filename:'c.js'});
const api=sandbox.__api;
console.log('RIGHT dist=20 ws=26 elev=0 — N3 vs N4:');
console.log('wa | N3(A/P/T)            N4(A/P/T)');
for(const wa of [0,30,60,90,120,150,180,210,240,270,300,330,338,350]){
  const all=api.searchTrico3in1Physics(20,20,'right',wa,26,0);
  const n3=(all||[]).find(r=>r.spinN===3), n4=(all||[]).find(r=>r.spinN===4);
  if(!n3||!n4){console.log(`wa=${wa}: missing n3=${!!n3} n4=${!!n4}`);continue;}
  const same=Math.abs(n3.angle-n4.angle)<0.01&&Math.abs(n3.power-n4.power)<0.001;
  console.log(`${String(wa).padStart(3)} | ${n3.angle.toFixed(2)}/${n3.power.toFixed(3)}/${n3.T.toFixed(2)}  ${n4.angle.toFixed(2)}/${n4.power.toFixed(3)}/${n4.T.toFixed(2)} ${same?'<< IDENTICAL':''}`);
}
