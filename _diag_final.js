const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics,EXCEL_TRICO};',sandbox,{filename:'c.js'});
const api = sandbox.__api;

// For the IMAGE case family: right, dist 10-25, wind 338 (tail+sink), ws 20-26
// Compare N3 angle from the solver vs what would be physically expected.
console.log('RIGHT N3, wind 338 (tail+sink), varying ws & dist — does angle blow up?');
console.log('dist ws | N3(A/P/T)        cap?');
const EP=0;
for(const dist of [10,15,18,20,22,25]){
  for(const ws of [10,15,18,22,26]){
    const all=api.searchTrico3in1Physics(20,20,'right',338,ws,0)||[];
    const n3=all.find(x=>x.spinN===3);
    if(!n3){console.log(`${String(dist).padStart(4)} ${String(ws).padStart(2)} | NULL`);continue;}
    // detect cap: recompute T_base+dT vs reported T
    const G=430,MASS=0.23;const wr=338*Math.PI/180;const cosW=Math.cos(wr);const force=Math.max(0,ws-1);
    const xA=cosW*force/MASS;const xDist=dist*40;
    const Tbase=4.1243-0.01039*dist;
    const sinW=Math.sin(wr);const wy_acc=sinW*force/MASS;
    const TunC=Tbase+(0.0243-0.00066*wy_acc);
    const Tcap=xA>0?Math.sqrt(2*xDist/xA)*0.92:Infinity;
    const capped = xA>0 && TunC>Tcap;
    console.log(`${String(dist).padStart(4)} ${String(ws).padStart(2)} | ${n3.angle.toFixed(1)}/${n3.power.toFixed(2)}/${n3.T.toFixed(2)}  ${capped?'<< CAPPED':'ok'}`);
  }
}
