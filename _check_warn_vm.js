// 直接在vm里复刻 powerAtIntegerAngle + fmtRound, 看返回值
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
const EP=516/13;
const all=api.searchTrico3in1Physics(5,20,'right',157,18,-1*EP);
const n3=all.find(r=>r.spinN===3);
const cr=n3.centerResult;
// 复刻UI的取整解逻辑 (:7462-7517)
const PF=0.004332712;
const rawA=n3.angle;        // 76.9189
const sol={ angleRaw:+rawA.toFixed(2), powerRaw:n3.power, spinN:3, centerResult:cr };
const aFloor=Math.floor(rawA+1e-9), aCeil=Math.ceil(rawA-1e-9);
const T_raw=parseFloat(cr.time);
const xA=parseFloat(cr.xA)||0;
const effGrav=parseFloat(cr.effectiveGravity)||430;
const rawV=n3.power/PF;
const cosRaw=Math.cos(rawA*Math.PI/180), sinRaw=Math.sin(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log(`raw: A=${rawA.toFixed(4)} P=${n3.power} T=${T_raw} aFloor=${aFloor} aCeil=${aCeil}`);
console.log(`xA=${xA.toFixed(2)} effGrav=${effGrav.toFixed(1)} xTarget=${xTarget.toFixed(2)} yTarget=${yTarget.toFixed(2)}`);
console.log('');
function powerAtIntegerAngle(targetAngle){
  const tanT=Math.tan(targetAngle*Math.PI/180);
  const cosT=Math.cos(targetAngle*Math.PI/180);
  const denom=effGrav+xA*tanT;
  if(denom<=0||!isFinite(denom)){return {fallback:true};}
  const T2=2*(tanT*xTarget-yTarget)/denom;
  if(T2<=0||!isFinite(T2)){return {fallback:true};}
  const T_new=Math.sqrt(T2);
  const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);
  if(!(V_new>0&&V_new<2000))return null;
  const p=V_new*PF;
  if(!(Number.isFinite(p)&&p>0&&p<7))return null;
  const dT=Math.abs(T_new-T_raw);
  const tol={[1]:0.05,[2]:0.08,[3]:0.12,[4]:0.15}[3]||0.12;
  if(dT>tol)return {power:p,dT,warn:true};
  return p;
}
function fmtRound(angle,pr){
  if(pr==null)return null;
  if(typeof pr==='object'){
    if(pr.warn)return {txt:`${angle}° / ${pr.power.toFixed(4)} ⚠`,tip:'warn'};
    if(pr.fallback)return {txt:`${angle}° / ≈${pr.power.toFixed(4)}`,tip:'fallback'};
    return {txt:`${angle}° / ≈${pr.power.toFixed(4)}`,tip:'参考'};
  }
  return {txt:`${angle}° / ${pr.toFixed(4)}`,tip:'ok'};
}
for(const a of [aFloor,aCeil]){
  const pr=powerAtIntegerAngle(a);
  const f=fmtRound(a,pr);
  console.log(`${a}°: powerAtIntegerAngle=${JSON.stringify(pr)}`);
  console.log(`   fmtRound=${JSON.stringify(f)}`);
}
