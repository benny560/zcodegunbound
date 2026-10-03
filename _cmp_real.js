// 只看真实数据: 67条实测 + 图片场景. 不掺虚构场景.
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
function makeSandbox(){return { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };}
function loadAPI(s){const sx=makeSandbox();sx.window=sx;sx.self=sx;sx.globalThis=sx;vm.createContext(sx);vm.runInContext(s+';globalThis.__api={EXCEL_TRICO};',sx,{filename:'c.js'});return sx.__api.EXCEL_TRICO;}
// 版本A: cap+>89
let sbA=sb;
sbA=sbA.replace('const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;','if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }\n                const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;');
sbA=sbA.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1 || angleRaw > 89) return null;');
sbA=sbA.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1 || angle > 89) return null;');
// 版本B: 删cap+无角度上限
let sbB=sb.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1) return null;');
sbB=sbB.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1) return null;');
const EXA=loadAPI(sbA),EXB=loadAPI(sbB);
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
function predict(EX,d){const dir=d.side==='右'?'right':'left';const elevInt=(d.elevation||0)*EP;const wa=effWa(d.side,d.windAngle);const res=EX.calcWithWind(20,dir,d.n,d.distance,elevInt,wa,d.windStrength);return res?{angle:res.angle,power:res.power}:null;}

const stats={};
const nullA=[],nullB=[];
const worstB=[];
for(const d of data){
  const a=predict(EXA,d), b=predict(EXB,d);
  const key='N'+d.n;
  if(!stats[key])stats[key]={n:0,aOK:0,bOK:0,aMaeA:0,bMaeA:0,aMaeP:0,bMaeP:0};
  stats[key].n++;
  if(a){stats[key].aOK++;stats[key].aMaeA+=Math.abs(a.angle-d.angle);stats[key].aMaeP+=Math.abs(a.power-d.power);}else nullA.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle}`);
  if(b){stats[key].bOK++;stats[key].bMaeA+=Math.abs(b.angle-d.angle);stats[key].bMaeP+=Math.abs(b.power-d.power);if(Math.abs(b.angle-d.angle)>1)worstB.push({d,b});}else nullB.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle}`);
}
console.log('=== 真实数据对比 (67条实测 + 图片场景) ===\n');
console.log('N   | A:出解 dA_MAE dP_MAE | B:出解 dA_MAE dP_MAE');
let tAa=0,tAp=0,tAn=0,tBa=0,tBp=0,tBn=0,tot=0;
for(const key of ['N1','N2','N3','N4']){
  const s=stats[key];tot+=s.n;
  const f=(ok,ma,mp)=>ok?`${ok}/${s.n}`.padEnd(5)+(ma/ok).toFixed(2).padStart(6)+(mp/ok).toFixed(3).padStart(6):`${ok}/${s.n} - -`;
  console.log(`${key}  | ${f(s.aOK,s.aMaeA,s.aMaeP)} | ${f(s.bOK,s.bMaeA,s.bMaeP)}`);
  tAa+=s.aMaeA;tAp+=s.aMaeP;tAn+=s.aOK;tBa+=s.bMaeA;tBp+=s.bMaeP;tBn+=s.bOK;
}
console.log('ALL | '+(tAa/tAn).toFixed(2)+' '+(tAp/tAn).toFixed(3)+' | '+(tBa/tBn).toFixed(2)+' '+(tBp/tBn).toFixed(3));
console.log('A NULL('+nullA.length+'): '+nullA.join(','));
console.log('B NULL('+nullB.length+'): '+nullB.join(','));

// 图片场景
console.log('\n=== 图片场景 右3 sd=20 wa=338 ws=26 (实测89.3/3.98) ===');
const img={side:'右',distance:20,windAngle:338,windStrength:26,elevation:0,n:3};
const ia=predict(EXA,img),ib=predict(EXB,img);
console.log('版本A:', ia?ia.angle.toFixed(2)+'/'+ia.power.toFixed(2):'NULL');
console.log('版本B:', ib?ib.angle.toFixed(2)+'/'+ib.power.toFixed(2):'NULL');

console.log('\n=== 版本B 误差>1°的样本 ===');
for(const r of worstB.sort((x,y)=>Math.abs(y.b.angle-y.d.angle)-Math.abs(x.b.angle-x.d.angle))){
  console.log(`  N${r.d.n} ${r.d.side}${r.d.distance} wa${r.d.windAngle} ws${r.d.windStrength}: pred${r.b.angle.toFixed(1)} real${r.d.angle} err${(r.b.angle-r.d.angle).toFixed(1)}`);
}
