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
let maxP=0; const over49=[];
for(const side of ['right','left'])for(const n of [1,2,3,4])for(const dist of [3,8,13,18,23,30,40])for(const wa of [0,45,90,135,180,225,270,315,338])for(const ws of [0,8,15,22,26])for(const elev of [-3,0,3]){
  const r=EX.calcWithWind(20,side,n,dist,elev*(516/13),wa,ws);
  if(!r)continue;
  if(r.power>maxP)maxP=r.power;
  if(r.power>=4.95)over49.push(`${side}N${n} d=${dist} wa=${wa} ws=${ws} e=${elev} -> ${r.angle.toFixed(1)}/${r.power.toFixed(3)}`);
}
console.log('最大power='+maxP.toFixed(4)+' (MAX_DISPLAY_POWER=5)');
console.log('power>=4.95的('+over49.length+'个):');
over49.slice(0,10).forEach(s=>console.log('  '+s));
