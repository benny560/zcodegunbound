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
const EP=516/13,effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;

console.log('=== 8标准点对照 (N4 right+left, wa=90 ws≈20) ===');
console.log('side sd | 实测A/P    | 方向B A/P            | dA     dP');
const stds=[
  {side:'右',sd:10,ws:20,a:84.4,p:3.86},{side:'右',sd:20,ws:20,a:79.3,p:3.88},
  {side:'右',sd:30,ws:20,a:73.9,p:3.93},{side:'右',sd:40,ws:21,a:68.4,p:3.97},
  {side:'左',sd:10,ws:20,a:83.6,p:3.35},{side:'左',sd:20,ws:20,a:76.6,p:3.38},
  {side:'左',sd:30,ws:20,a:70,p:3.46},{side:'左',sd:40,ws:20,a:63.5,p:3.59},
];
let mA=0,mP=0;
for(const t of stds){
  const dir=t.side==='右'?'right':'left';
  const all=api.searchTrico3in1Physics(t.sd,20,dir,90,t.ws,0);
  const r=(all||[]).find(x=>x.spinN===4);
  if(!r){console.log(`${t.side}${t.sd}: NULL`);continue;}
  const dA=r.angle-t.a, dP=r.power-t.p;
  mA+=Math.abs(dA);mP+=Math.abs(dP);
  console.log(`${t.side} ${String(t.sd).padStart(3)} | ${t.a}/${t.p}  | ${r.angle.toFixed(2)}/${r.power.toFixed(3)} [${r.source}] | ${(dA>=0?'+':'')+dA.toFixed(2)}  ${(dP>=0?'+':'')+dP.toFixed(3)}`);
}
console.log(`8标准点 MAE: dA=${(mA/8).toFixed(2)}° dP=${(mP/8).toFixed(3)}`);

console.log('\n=== 图片场景对照 (左4 sd=33 wa=90 ws=12, 实测70/3.81) ===');
const img=api.searchTrico3in1Physics(33,20,'left',90,12,0);
const n4=(img||[]).find(x=>x.spinN===4);
console.log('方向B:', n4?n4.angle.toFixed(2)+'/'+n4.power.toFixed(3)+' T='+n4.T.toFixed(3)+' ['+n4.source+']':'NULL');
console.log('实测: 70/3.81');
console.log('旧v1.07: 70.41/3.872');

console.log('\n=== 全量回归 ===');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const stats={};let nullN=[];
for(const d of data){
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const all=api.searchTrico3in1Physics(d.distance,20,dir,wa,d.windStrength,(d.elevation||0)*EP);
  const r=(all||[]).find(x=>x.spinN===d.n);
  const k='N'+d.n; if(!stats[k])stats[k]={n:0,ok:0,sA:0,sP:0};stats[k].n++;
  if(r){stats[k].ok++;stats[k].sA+=Math.abs(r.angle-d.angle);stats[k].sP+=Math.abs(r.power-d.power);}
  else nullN.push(`N${d.n} ${d.side}${d.distance}`);
}
let ta=0,tp=0,tn=0;
for(const k of ['N1','N2','N3','N4']){const s=stats[k];console.log(`${k}: ${s.ok}/${s.n} dA_MAE=${(s.sA/s.ok).toFixed(2)} dP_MAE=${(s.sP/s.ok).toFixed(3)}`);ta+=s.sA;tp+=s.sP;tn+=s.ok;}
console.log(`ALL: ${tn}/${data.length} dA_MAE=${(ta/tn).toFixed(2)} dP_MAE=${(tp/tn).toFixed(3)}`);
console.log('NULL('+nullN.length+'): '+nullN.join(','));
