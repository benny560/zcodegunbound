// 对比 v1.05(cap) 和 v1.06(删cap) 在红框场景的取整解
const fs=require('fs'),vm=require('vm');
const htmlCur=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCur.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
function makeSandbox(){return { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };}
function loadAPI(s){const sx=makeSandbox();sx.window=sx;sx.self=sx;sx.globalThis=sx;vm.createContext(sx);vm.runInContext(s+';globalThis.__api={searchTrico3in1Physics};',sx,{filename:'c.js'});return sx.__api.searchTrico3in1Physics;}
// v1.05: 恢复cap+>89
let sbA=sb;
sbA=sbA.replace('const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;','if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }\n                const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;');
sbA=sbA.replace('if (angleRaw < 1) return null;','if (angleRaw < 1 || angleRaw > 89) return null;');
sbA=sbA.replace('if (angle < 1) return null;','if (angle < 1 || angle > 89) return null;');
const apiA=loadAPI(sbA);
const apiB=loadAPI(sb); // v1.06当前
const EP=516/13,PF=0.004332712;
function roundSol(api,label){
  const all=api(5,20,'right',157,18,-1*EP);
  const n3=all.find(r=>r.spinN===3);
  const cr=n3.centerResult;
  const rawA=n3.angle, rawP=n3.power, T_raw=parseFloat(cr.time);
  const xA=parseFloat(cr.xA)||0, effGrav=parseFloat(cr.effectiveGravity)||430;
  const rawV=rawP/PF;
  const cosRaw=Math.cos(rawA*Math.PI/180),sinRaw=Math.sin(rawA*Math.PI/180);
  const xT=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
  const yT=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
  console.log(`\n${label}: raw=${rawA.toFixed(4)}/${rawP}/${T_raw} src=${n3.source}`);
  for(const a of [Math.floor(rawA+1e-9),Math.ceil(rawA-1e-9)]){
    const tanT=Math.tan(a*Math.PI/180),cosT=Math.cos(a*Math.PI/180);
    const denom=effGrav+xA*tanT;
    const T2=2*(tanT*xT-yT)/denom;
    const T_new=Math.sqrt(T2);
    const V_new=(xT-0.5*xA*T_new*T_new)/(cosT*T_new);
    const p=V_new*PF;
    const dT=Math.abs(T_new-T_raw);
    const warn=dT>0.12;
    console.log(`  ${a}°: power=${p.toFixed(4)} T_new=${T_new.toFixed(4)} dT=${dT.toFixed(4)} ${warn?'⚠':'ok'}`);
  }
}
roundSol(apiA,'v1.05(cap+>89)');
roundSol(apiB,'v1.06(删cap)');
