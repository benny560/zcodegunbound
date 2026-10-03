// 关键: v1数据里有没有"顺风大风高角度"场景? 没有的话两版本当然一样.
// 直接测图片场景 + 一组顺风大风扫描, 看两版本差异.
const fs=require('fs'),vm=require('vm');
const htmlCurrent=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=htmlCurrent.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
function makeSandbox(){return { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };}
function loadAPI(s){const sx=makeSandbox();sx.window=sx;sx.self=sx;sx.globalThis=sx;vm.createContext(sx);vm.runInContext(s+';globalThis.__api={EXCEL_TRICO};',sx,{filename:'c.js'});return sx.__api.EXCEL_TRICO;}
let sbA=sb;
sbA=sbA.replace('const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;','if (xA > 0) { const T_cap = Math.sqrt(2 * xDist / xA) * 0.92; if (T_target > T_cap) T_target = T_cap; }\n                const halfEffG_T2 = 0.5 * effGravCalc * T_target * T_target;');
sbA=sbA.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1 || angleRaw > 89) return null;');
sbA=sbA.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1 || angle > 89) return null;');
let sbB=sb.replace('if (angleRaw < 1 || angleRaw > 89.5) return null;','if (angleRaw < 1) return null;');
sbB=sbB.replace('if (angle < 1 || angle > 89.5) return null;','if (angle < 1) return null;');
const EXA=loadAPI(sbA),EXB=loadAPI(sbB);
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
function pred(EX,side,n,dist,wa0,ws,elev){const dir=side==='右'?'right':'left';const wa=effWa(side,wa0);return EX.calcWithWind(20,dir,n,dist,(elev||0)*(516/13),wa,ws);}

console.log('=== 顺风大风场景扫描(右攻, 触发cap的区域) ===');
console.log('dist wa ws | 版本A           版本B          差异');
for(const [dist,wa,ws] of [[20,338,26],[20,0,26],[20,350,26],[15,0,26],[25,336,20],[10,0,24],[18,10,24]]){
  const a=pred(EXA,'右',3,dist,wa,ws,0), b=pred(EXB,'右',3,dist,wa,ws,0);
  const aS=a?a.angle.toFixed(1)+'/'+a.power.toFixed(2):'NULL';
  const bS=b?b.angle.toFixed(1)+'/'+b.power.toFixed(2):'NULL';
  const diff = (a&&b)?((a.angle-b.angle).toFixed(1)+'°'):(aS!==bS?'A=NULL或B=NULL':'');
  console.log(`${String(dist).padStart(4)} ${String(wa).padStart(3)} ${String(ws).padStart(2)} | ${aS.padStart(14)} ${bS.padStart(14)}  ${diff}`);
}
console.log('\n图片场景(右3 sd=20 wa=338 ws=26, 实测89.3/3.98):');
const a=pred(EXA,'右',3,20,338,26,0),b=pred(EXB,'右',3,20,338,26,0);
console.log('  A:', a?a.angle.toFixed(2)+'/'+a.power.toFixed(2):'NULL');
console.log('  B:', b?b.angle.toFixed(2)+'/'+b.power.toFixed(2):'NULL');
