// 精确复现 powerAtIntegerAngle(76) 的返回, 确认 warn 是否触发
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
// 复刻 powerAtIntegerAngle 逻辑
const PF=0.004332712;
const rawA=n3.angleRaw;
const T_raw=parseFloat(cr.time);
const xA=parseFloat(cr.xA)||0;
const effGrav=parseFloat(cr.effectiveGravity)||430;
const rawV=n3.powerRaw/PF;
const cosRaw=Math.cos(rawA*Math.PI/180), sinRaw=Math.sin(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log('rawA='+rawA+' T_raw='+T_raw+' xA='+xA+' effGrav='+effGrav);
console.log('xTarget='+xTarget.toFixed(2)+' yTarget='+yTarget.toFixed(2));
console.log('powerRaw='+n3.powerRaw+' rawV='+rawV.toFixed(1));
console.log('');
for(const targetAngle of [76,77]){
  const tanT=Math.tan(targetAngle*Math.PI/180);
  const cosT=Math.cos(targetAngle*Math.PI/180);
  const denom=effGrav+xA*tanT;
  console.log(`${targetAngle}°: tanT=${tanT.toFixed(4)} denom=${denom.toFixed(2)}`);
  if(denom<=0||!isFinite(denom)){console.log('  denom<=0 fallback');continue;}
  const T2=2*(tanT*xTarget-yTarget)/denom;
  console.log(`  T2=${T2.toFixed(4)}`);
  if(T2<=0||!isFinite(T2)){console.log('  T2<=0 fallback');continue;}
  const T_new=Math.sqrt(T2);
  const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);
  const p=V_new*PF;
  const dT=Math.abs(T_new-T_raw);
  const tol={1:0.05,2:0.08,3:0.12,4:0.15}[3]||0.12;
  console.log(`  T_new=${T_new.toFixed(4)} V_new=${V_new.toFixed(1)} power=${p.toFixed(4)} dT=${dT.toFixed(4)} tol=${tol} ${dT>tol?'⚠WARN':'ok'}`);
  console.log(`  返回: ${dT>tol?`{power:${p.toFixed(4)},dT:${dT.toFixed(4)},warn:true}`:p.toFixed(4)}`);
}
