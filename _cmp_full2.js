// 全量67样本(v1数据), 正确做左攻风向转换, 两版本对比
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
function makeSandbox(){return { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };}
function loadAPI(scriptBody){const sx=makeSandbox();sx.window=sx;sx.self=sx;sx.globalThis=sx;vm.createContext(sx);vm.runInContext(scriptBody+';globalThis.__api={EXCEL_TRICO};',sx,{filename:'c.js'});return sx.__api.EXCEL_TRICO;}

// 版本A: 恢复cap+>89
let sbA=sb;
sbA=sbA.replace('const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;',
  'if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }\n                const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;');
sbA=sbA.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1 || angleRaw > 89) return null;');
sbA=sbA.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1 || angle > 89) return null;');
// 版本B: 删cap + 无角度上限(只留<1)
let sbB=sb.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1) return null;');
sbB=sbB.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1) return null;');

const EXA=loadAPI(sbA), EXB=loadAPI(sbB);
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
function predict(EX,d){const dir=d.side==='右'?'right':'left';const elevInt=(d.elevation||0)*EP;const wa=effWa(d.side,d.windAngle);const res=EX.calcWithWind(20,dir,d.n,d.distance,elevInt,wa,d.windStrength);return res?{angle:res.angle,power:res.power,src:res.source}:null;}

const stats={};
const nullA=[],nullB=[];
const detail=[];
for(const d of data){
  const a=predict(EXA,d), b=predict(EXB,d);
  const key='N'+d.n;
  if(!stats[key])stats[key]={n:0,aOK:0,bOK:0,aMaeA:0,aMaeP:0,bMaeA:0,bMaeP:0,aSumA:0,bSumA:0};
  stats[key].n++;
  if(a){stats[key].aOK++;stats[key].aMaeA+=Math.abs(a.angle-d.angle);stats[key].aMaeP+=Math.abs(a.power-d.power);stats[key].aSumA+=a.angle-d.angle;}else nullA.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}`);
  if(b){stats[key].bOK++;stats[key].bMaeA+=Math.abs(b.angle-d.angle);stats[key].bMaeP+=Math.abs(b.power-d.power);stats[key].bSumA+=b.angle-d.angle;}else nullB.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}`);
  detail.push({d,a,b});
}
console.log('=== 全量67样本(v1) 对比 ===\n');
console.log('N   | 版本A 出解 dA_mean dA_MAE dP_MAE | 版本B 出解 dA_mean dA_MAE dP_MAE');
let tAa=0,tAp=0,tAn=0,tBa=0,tBp=0,tBn=0,tot=0;
for(const key of ['N1','N2','N3','N4']){
  const s=stats[key];if(!s)continue;tot+=s.n;
  const fmt=(ok,sm,maeA,maeP)=>ok?`${ok}/${s.n}`.padEnd(5)+' '+(sm/ok).toFixed(2).padStart(6)+' '+(maeA/ok).toFixed(2).padStart(6)+' '+(maeP/ok).toFixed(3).padStart(6):`${ok}/${s.n}`.padEnd(5)+'    -      -      -';
  console.log(`${key}  | ${fmt(s.aOK,s.aSumA,s.aMaeA,s.aMaeP)}  | ${fmt(s.bOK,s.bSumA,s.bMaeA,s.bMaeP)}`);
  tAa+=s.aMaeA;tAp+=s.aMaeP;tAn+=s.aOK;tBa+=s.bMaeA;tBp+=s.bMaeP;tBn+=s.bOK;
}
console.log('ALL | A:出解'+tAn+'/'+tot+' dA_MAE='+(tAa/tAn).toFixed(2)+' dP_MAE='+(tAp/tAn).toFixed(3)+' | B:出解'+tBn+'/'+tot+' dA_MAE='+(tBa/tBn).toFixed(2)+' dP_MAE='+(tBp/tBn).toFixed(3));
console.log('\n版本A NULL('+nullA.length+'): '+nullA.join(', ')||'(无)');
console.log('版本B NULL('+nullB.length+'): '+nullB.join(', ')||'(无)');

// 输出worst样本对比
console.log('\n=== 版本A vs B 差异最大的8个样本(|dA_A - dA_B|排序) ===');
const diff = detail.map(r=>{
  const da=r.a?r.a.angle-r.d.angle:null, db=r.b?r.b.angle-r.d.angle:null;
  const ddiff = (da!=null&&db!=null)?Math.abs(da-db):99;
  return {d:r.d, a:r.a, b:r.b, da, db, ddiff};
}).sort((x,y)=>y.ddiff-x.ddiff);
console.log('sideN sd   wa ws | realA | A_pred(A_err) B_pred(B_err)');
for(const r of diff.slice(0,8)){
  const aStr=r.a?`${r.a.angle.toFixed(1)}(${r.da>=0?'+':''}${r.da.toFixed(1)})`:'NULL';
  const bStr=r.b?`${r.b.angle.toFixed(1)}(${r.db>=0?'+':''}${r.db.toFixed(1)})`:'NULL';
  console.log(`${r.d.side}${r.d.n} ${String(r.d.distance).padStart(5)} ${String(r.d.windAngle).padStart(3)} ${String(r.d.windStrength).padStart(2)} | ${String(r.d.angle).padStart(3)} | ${aStr.padStart(14)} ${bStr.padStart(14)}`);
}
