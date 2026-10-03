// 全量54样本对比 N1-N4: 版本A(cap+>89) vs 版本B(删cap+无角度上限)
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
function makeSandbox(){return { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };}
function loadAPI(scriptBody){const sx=makeSandbox();sx.window=sx;sx.self=sx;sx.globalThis=sx;vm.createContext(sx);vm.runInContext(scriptBody+';globalThis.__api={EXCEL_TRICO};',sx,{filename:'c.js'});return sx.__api.EXCEL_TRICO;}

// 版本A: 恢复cap + >89
let sbA=sb;
sbA=sbA.replace('const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;',
  'if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }\n                const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;');
sbA=sbA.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1 || angleRaw > 89) return null;');
sbA=sbA.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1 || angle > 89) return null;');
// 版本B: 删cap + 落地时间求解器无角度上限(只留<1)
let sbB=sb.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1) return null;');
sbB=sbB.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1) return null;');

const EXA=loadAPI(sbA), EXB=loadAPI(sbB);
const data=JSON.parse(fs.readFileSync('_real.json','utf8'));
const EP=516/13;
function predict(EX,d){const dir=d.side==='右'?'right':'left';const elevInt=(d.elevation||0)*EP;const res=EX.calcWithWind(20,dir,d.n,d.distance,elevInt,d.windAngle,d.windStrength);return res?{angle:res.angle,power:res.power,src:res.source}:null;}

console.log('=== 全量54样本对比 ===\n');
// 按N分组统计
const stats={};
let nullA=[], nullB=[];
for(const d of data){
  const a=predict(EXA,d), b=predict(EXB,d);
  const key='N'+d.n;
  if(!stats[key])stats[key]={n:0,aOK:0,bOK:0,aSumA:0,aSumP:0,bSumA:0,bSumP:0,aMaeA:0,aMaeP:0,bMaeA:0,bMaeP:0};
  stats[key].n++;
  if(a){stats[key].aOK++;stats[key].aSumA+=a.angle-d.angle;stats[key].aSumP+=a.power-d.power;stats[key].aMaeA+=Math.abs(a.angle-d.angle);stats[key].aMaeP+=Math.abs(a.power-d.power);}else nullA.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}`);
  if(b){stats[key].bOK++;stats[key].bSumA+=b.angle-d.angle;stats[key].bSumP+=b.power-d.power;stats[key].bMaeA+=Math.abs(b.angle-d.angle);stats[key].bMaeP+=Math.abs(b.power-d.power);}else nullB.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}`);
}
console.log('N   | 版本A 出解  dA_mean  dA_MAE  dP_MAE | 版本B 出解  dA_mean  dA_MAE  dP_MAE');
for(const key of ['N1','N2','N3','N4']){
  const s=stats[key];
  const aD=`${s.aOK}/${s.n}`.padEnd(5), bD=`${s.bOK}/${s.n}`.padEnd(5);
  const aM=s.aOK?`${(s.aSumA/s.aOK).toFixed(2)}`.padStart(7)+' '+(s.aMaeA/s.aOK).toFixed(2).padStart(6)+' '+(s.aMaeP/s.aOK).toFixed(3).padStart(6):'   -       -      -';
  const bM=s.bOK?`${(s.bSumA/s.bOK).toFixed(2)}`.padStart(7)+' '+(s.bMaeA/s.bOK).toFixed(2).padStart(6)+' '+(s.bMaeP/s.bOK).toFixed(3).padStart(6):'   -       -      -';
  console.log(`${key}  | ${aD}   ${aM}  | ${bD}   ${bM}`);
}
// 全量合计
let tA=0,tB=0,tAn=0,tBn=0,tAa=0,tBa=0,tAp=0,tBp=0;
for(const key of Object.keys(stats)){const s=stats[key];tA+=s.aMaeA;tAp+=s.aMaeP;tAn+=s.aOK;tB+=s.bMaeA;tBp+=s.bMaeP;tBn+=s.bOK;}
console.log(`ALL | A:出解${tAn}/${data.length} dA_MAE=${(tA/tAn).toFixed(2)} dP_MAE=${(tAp/tAn).toFixed(3)} | B:出解${tBn}/${data.length} dA_MAE=${(tB/tBn).toFixed(2)} dP_MAE=${(tBp/tBn).toFixed(3)}`);

console.log('\n版本A NULL样本('+nullA.length+'): '+nullA.join(', '));
console.log('版本B NULL样本('+nullB.length+'): '+nullB.join(', '));
