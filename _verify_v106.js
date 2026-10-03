const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={EXCEL_TRICO};',sandbox,{filename:'c.js'});
const EX = sandbox.__api.EXCEL_TRICO;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const stats={};let nullN=[];
for(const d of data){
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const res=EX.calcWithWind(20,dir,d.n,d.distance,(d.elevation||0)*EP,wa,d.windStrength);
  const k='N'+d.n; if(!stats[k])stats[k]={n:0,ok:0,maeA:0,maeP:0};stats[k].n++;
  if(res){stats[k].ok++;stats[k].maeA+=Math.abs(res.angle-d.angle);stats[k].maeP+=Math.abs(res.power-d.power);}
  else nullN.push(`N${d.n} ${d.side}${d.distance} wa${d.windAngle} ws${d.windStrength}`);
}
console.log('=== v1.06 全量67样本回归 ===');
let ta=0,tp=0,tn=0,tot=0;
for(const k of ['N1','N2','N3','N4']){const s=stats[k];tot+=s.n;console.log(`${k}: ${s.ok}/${s.n} dA_MAE=${(s.maeA/s.ok).toFixed(2)} dP_MAE=${(s.maeP/s.ok).toFixed(3)}`);ta+=s.maeA;tp+=s.maeP;tn+=s.ok;}
console.log(`ALL: ${tn}/${tot} dA_MAE=${(ta/tn).toFixed(2)} dP_MAE=${(tp/tn).toFixed(3)}`);
console.log('NULL('+nullN.length+'): '+nullN.join(','));
// 图片场景
const img=EX.calcWithWind(20,'right',3,20,0,338,26);
console.log('\n图片场景(右3 sd=20 wa=338 ws=26 实测89.3/3.98):', img?img.angle.toFixed(2)+'/'+img.power.toFixed(2):'NULL');
