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
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13,effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
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
console.log('=== v1.08 全量回归 ===');
let ta=0,tp=0,tn=0;
for(const k of ['N1','N2','N3','N4']){const s=stats[k];console.log(`${k}: ${s.ok}/${s.n} dA_MAE=${(s.sA/s.ok).toFixed(2)} dP_MAE=${(s.sP/s.ok).toFixed(3)}`);ta+=s.sA;tp+=s.sP;tn+=s.ok;}
console.log(`ALL: ${tn}/${data.length} dA_MAE=${(ta/tn).toFixed(2)} dP_MAE=${(tp/tn).toFixed(3)}`);
console.log('NULL('+nullN.length+'): '+nullN.join(','));
// 4标准点 + 图片N4
console.log('\n4标准点(N4right 方向B):');
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},{sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97}]){
  const all=api.searchTrico3in1Physics(t.sd,20,'right',90,t.ws,0);
  const r=(all||[]).find(x=>x.spinN===4);
  console.log(`  sd=${t.sd}: ${r?r.angle.toFixed(2)+'/'+r.power.toFixed(3)+' ['+r.source+']':'NULL'} (实测${t.a}/${t.p})`);
}
console.log('\n图片N4(左4 sd=33 wa=90 ws=12):');
const img=api.searchTrico3in1Physics(33,20,'left',90,12,0);
const n4=(img||[]).find(x=>x.spinN===4);
console.log('  ',n4?n4.angle.toFixed(2)+'/'+n4.power.toFixed(3)+' ['+n4.source+']':'NULL','(实测附近69/4.0)');
