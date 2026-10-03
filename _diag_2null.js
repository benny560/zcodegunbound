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

// 2个NULL样本, 手算落地时间求解器每一步, 找断点
function trace(d){
  const sdParts=20,dir=d.side==='右'?'right':'left',spinN=d.n;
  const sd=Math.abs(d.distance),elevInt=(d.elevation||0)*EP;
  const G=430,MASS=0.23;
  const fit=EX.timePhysicsNoWindT[`${dir}:${spinN}`];
  const wr=d.windAngle*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const ws=Math.max(0,d.windStrength||0);
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS,effGrav=G-sinW*force/MASS,wy_acc=sinW*force/MASS;
  const xDist=sd*(800/sdParts);
  let T_base,G_base;
  if(spinN===1){const tg=EX.lookupN1TimeGravity(dir,spinN,sd);if(!tg)return {note:'N1 T/G lookup fail'};T_base=tg.T;G_base=tg.G;}
  else{T_base=fit.a+fit.b*sd;G_base=G;}
  const dT=0.0243-0.00066*wy_acc;
  const T_target=T_base+dT;
  const effGravCalc=G_base-sinW*force/MASS;
  const denom=xDist-0.5*xA*T_target*T_target;
  let step='denom';
  if(T_target<=0)return {note:'T_target<=0',T_target};
  if(effGravCalc<=0)return {note:'effGravCalc<=0',effGravCalc};
  if(Math.abs(denom)<0.001)return {note:'denom<0.001',denom,T_target,xDist,xA};
  const tanA=(elevInt+0.5*effGravCalc*T_target*T_target)/denom;
  const angleRaw=Math.atan(tanA)*180/Math.PI;
  step='angleRaw';
  return {T_base:+T_base.toFixed(4),dT:+dT.toFixed(4),T_target:+T_target.toFixed(4),xA:+xA.toFixed(2),effGravCalc:+effGravCalc.toFixed(2),denom:+denom.toFixed(2),xDist:+xDist.toFixed(1),tanA:tanA.toFixed(2),angleRaw:+angleRaw.toFixed(3),force};
}
for(const d of [{side:'左',distance:3,elevation:-0.5,windAngle:12,windStrength:26,angle:72,power:3.1,n:3},
                {side:'左',distance:9.24,elevation:-1.18,windAngle:18,windStrength:25,angle:67,power:3.19,n:3}]){
  console.log(`N${d.n} ${d.side} sd=${d.distance} wa=${d.windAngle} ws=${d.windStrength} elev=${d.elevation} (实测${d.angle}/${d.power}):`);
  const t=trace(d);
  console.log('  ', JSON.stringify(t));
  // 也看实测反推的真实T
  const G=430,MASS=0.23,PF=0.004332712;
  const wr=d.windAngle*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=Math.max(0,d.windStrength-1);
  const xA=cosW*force/MASS,effGrav=G-sinW*force/MASS;
  const V=d.power/PF,aR=d.angle*Math.PI/180,vx=V*Math.cos(aR),vy=V*Math.sin(aR);
  const disc=vy*vy-2*effGrav*(d.elevation||0)*EP;
  const tLand=disc>=0?(vy+Math.sqrt(disc))/effGrav:null;
  const xLand=tLand?vx*tLand+0.5*xA*tLand*tLand:null;
  const xDist=Math.abs(d.distance)*40;
  console.log(`  实测反推: T_true=${tLand?tLand.toFixed(3):'NaN'} xLand=${xLand?xLand.toFixed(0):'NaN'}(目标${xDist})`);
}
