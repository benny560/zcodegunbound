// 并排对比 N3: 版本A(原始cap+>89) vs 版本B(删cap+无角度上限,只留cosA/power)
// 两个版本都在内存里 patch, 不动文件. 对全量N3实测样本跑, 输出残差对比.
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8'); // 已是版本B基础(删cap+89.5)
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];

const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
function makeSandbox(){return { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };}

// === 版本A: 原始 (cap + >89) ===
// 从当前文件反向恢复: 把删cap处加回cap, 把89.5改回89
let sbA = sb;
// 恢复cap: 当前是 "const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;" 前面是新版注释
// 直接在 "const halfEffG_T2" 前插入cap块
const capBlock = `if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }
                `;
sbA = sbA.replace(
  'const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;',
  capBlock + 'const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;'
);
// 恢复 >89 (落地时间求解器两处)
sbA = sbA.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;', 'if (angleRaw < 1 || angleRaw > 89) return null;');
sbA = sbA.replace('if (angle < 1 || angle > 89.5) return null;', 'if (angle < 1 || angle > 89) return null;');

// === 版本B: 当前文件 (删cap + 89.5) → 进一步把落地时间求解器的角度上限交给cosA/power ===
// 把 "> 89.5" 完全去掉角度上限, 只保留 <1 下限 (cosA<=0.001 和 power>MAX 已存在)
let sbB = sb.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;', 'if (angleRaw < 1) return null;');
sbB = sbB.replace('if (angle < 1 || angle > 89.5) return null;', 'if (angle < 1) return null;');

function loadAPI(scriptBody){
  const sx=makeSandbox();
  sx.window=sx;sx.self=sx;sx.globalThis=sx;
  vm.createContext(sx);
  vm.runInContext(scriptBody+';globalThis.__api={EXCEL_TRICO};',sx,{filename:'c.js'});
  return sx.__api.EXCEL_TRICO;
}
const EXA=loadAPI(sbA);
const EXB=loadAPI(sbB);

const data=JSON.parse(fs.readFileSync('_real.json','utf8')).filter(d=>d.n===3);
const EP=516/13;

function predict(EX, d){
  const dir=d.side==='右'?'right':'left';
  const elevInt=(d.elevation||0)*EP;
  const res=EX.calcWithWind(20,dir,3,d.distance,elevInt,d.windAngle,d.windStrength);
  if(!res) return null;
  return {angle:res.angle, power:res.power, src:res.source};
}

console.log('=== N3 全量实测对比 (版本A: cap+>89  vs  版本B: 删cap+无角度上限) ===\n');
console.log('side sd    wa ws elev | realA/realP | A: predA/predP         B: predA/predP         A_err      B_err');
let nA=0,nB=0,sumAa=0,sumBa=0,sumAp=0,sumBp=0,maeAa=0,maeBa=0,maeAp=0,maeBp=0;
const rows=[];
for(const d of data){
  const dir=d.side==='右'?'R':'L';
  const a=predict(EXA,d), b=predict(EXB,d);
  const ea=a?{a:a.angle-d.angle,p:a.power-d.power}:null;
  const eb=b?{a:b.angle-d.angle,p:b.power-d.power}:null;
  if(a){nA++;sumAa+=ea.a;sumAp+=ea.p;maeAa+=Math.abs(ea.a);maeAp+=Math.abs(ea.p);}
  if(b){nB++;sumBa+=eb.a;sumBp+=eb.p;maeBa+=Math.abs(eb.a);maeBp+=Math.abs(eb.p);}
  const aStr=a?`${a.angle.toFixed(1)}/${a.power.toFixed(2)}`:'NULL';
  const bStr=b?`${b.angle.toFixed(1)}/${b.power.toFixed(2)}`:'NULL';
  const eaStr=ea?`${ea.a>=0?'+':''}${ea.a.toFixed(1)}°/${ea.p>=0?'+':''}${ea.p.toFixed(2)}`:'-';
  const ebStr=eb?`${eb.a>=0?'+':''}${eb.a.toFixed(1)}°/${eb.p>=0?'+':''}${eb.p.toFixed(2)}`:'-';
  rows.push(`${dir} ${String(d.distance).padStart(5)} ${String(d.windAngle).padStart(3)} ${String(d.windStrength).padStart(2)} ${String(d.elevation||0).padStart(4)} | ${String(d.angle).padStart(3)}/${d.power.toFixed(2)} | ${aStr.padStart(20)} ${bStr.padStart(20)} ${eaStr.padStart(14)} ${ebStr.padStart(14)}`);
}
// 只打印前几行+图片场景+worst, 避免太长
console.log(rows.slice(0,12).join('\n'));
console.log('... (共'+rows.length+'行)');
console.log('\n=== 汇总统计 ===');
console.log(`版本A: 出解 ${nA}/${data.length}, dA mean=${(sumAa/nA).toFixed(2)} MAE=${(maeAa/nA).toFixed(2)}, dP mean=${(sumAp/nA).toFixed(3)} MAE=${(maeAp/nA).toFixed(3)}`);
console.log(`版本B: 出解 ${nB}/${data.length}, dA mean=${(sumBa/nB).toFixed(2)} MAE=${(maeBa/nB).toFixed(2)}, dP mean=${(sumBp/nB).toFixed(3)} MAE=${(maeBp/nB).toFixed(3)}`);

// 图片场景单独验证
console.log('\n=== 图片场景 (right dist=20 wa=338 ws=26 elev=0, 实测≈89.3/3.98) ===');
const imgA=predict(EXA,{side:'右',distance:20,windAngle:338,windStrength:26,elevation:0,angle:89.3,power:3.98});
const imgB=predict(EXB,{side:'右',distance:20,windAngle:338,windStrength:26,elevation:0,angle:89.3,power:3.98});
console.log('版本A:', imgA?`${imgA.angle.toFixed(2)}/${imgB.power.toFixed(2)} (${imgA.src})`:'NULL');
console.log('版本B:', imgB?`${imgB.angle.toFixed(2)}/${imgB.power.toFixed(2)} (${imgB.src})`:'NULL');
console.log('实测:   89.3/3.98');
