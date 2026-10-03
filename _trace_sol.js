// 完整复刻 :7238-7541 的 sol 构建 + 取整解, 看实际值
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return []; }, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics,EXCEL_TRICO};',sandbox,{filename:'c.js'});
const api={searchTrico3in1Physics:sandbox.__api.searchTrico3in1Physics}; const EX=sandbox.__api.EXCEL_TRICO;
const EP=516/13,PF=0.004332712;
const all=api.searchTrico3in1Physics(5,20,'right',157,18,-1*EP);
const pr=all.find(r=>r.spinN===3);
const cr=pr.centerResult;
const baseAngle=pr.angle, basePower=pr.power;
// 角化力补偿 :7259-7284
const rawAngleVal=baseAngle;
const roundedAngle=EX.roundAngleForTrico(rawAngleVal);
let finalAngle=roundedAngle, finalPower=basePower;
if(pr.spinN!==1 && Math.abs(roundedAngle-rawAngleVal)>0.001){
  const T=parseFloat(cr.time), xA=parseFloat(cr.xA)||0;
  const cosRound=Math.cos(roundedAngle*Math.PI/180);
  const rawV=basePower/0.004332712;
  const cosRaw=Math.cos(rawAngleVal*Math.PI/180);
  const xLand=rawV*cosRaw*T+0.5*xA*T*T;
  if(cosRound>0.001&&T>0){
    const V_round=(xLand-0.5*xA*T*T)/(cosRound*T);
    const pRound=V_round*0.004332712;
    if(Number.isFinite(pRound)&&pRound>0&&pRound<7)finalPower=pRound;
  }
}
// sol对象 :7285
const sol={angle:finalAngle,angleRaw:+rawAngleVal.toFixed(2),power:+finalPower.toFixed(4),powerRaw:+basePower.toFixed(4),time:+parseFloat(cr.time).toFixed(4),spinN:pr.spinN,centerResult:cr};
console.log('sol对象:',JSON.stringify({angle:sol.angle,angleRaw:sol.angleRaw,power:sol.power,powerRaw:sol.powerRaw,time:sol.time,spinN:sol.spinN}));
console.log('cr字段:',JSON.stringify({time:cr.time,xA:cr.xA,effectiveGravity:cr.effectiveGravity}));
console.log('roundedAngle(5舍6入):',roundedAngle);
console.log('');
// 取整解 :7462-
const rawA=sol.angleRaw; // 76.92
const aFloor=Math.floor(rawA+1e-9),aCeil=Math.ceil(rawA-1e-9);
console.log(`aFloor=${aFloor} aCeil=${aCeil} (rawA=${rawA})`);
// powerAtIntegerAngle用 sol.powerRaw 和 sol.centerResult
const T_raw=parseFloat(sol.centerResult.time);
const xA=parseFloat(sol.centerResult.xA)||0;
const effGrav=parseFloat(sol.centerResult.effectiveGravity)||430;
const rawV=sol.powerRaw/PF;
const cosRaw=Math.cos(rawA*Math.PI/180),sinRaw=Math.sin(rawA*Math.PI/180);
const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
const yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
console.log(`T_raw=${T_raw} xA=${xA} effGrav=${effGrav} rawV=${rawV.toFixed(1)}`);
console.log(`xTarget=${xTarget.toFixed(4)} yTarget=${yTarget.toFixed(4)}`);
for(const targetAngle of [aFloor,aCeil]){
  const tanT=Math.tan(targetAngle*Math.PI/180),cosT=Math.cos(targetAngle*Math.PI/180);
  const denom=effGrav+xA*tanT;
  const T2=2*(tanT*xTarget-yTarget)/denom;
  const T_new=Math.sqrt(T2);
  const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);
  const p=V_new*PF;
  const dT=Math.abs(T_new-T_raw);
  const tol=0.12;
  const ret = dT>tol?{power:+p.toFixed(4),dT:+dT.toFixed(4),warn:true}:+p.toFixed(4);
  console.log(`${targetAngle}°: power=${p.toFixed(4)} dT=${dT.toFixed(4)} ${dT>tol?'⚠WARN':'ok'} 返回=${JSON.stringify(ret)}`);
}
