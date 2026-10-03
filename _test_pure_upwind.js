// 策略: N4只在纯上风(wa≈90, |cosW|<0.1)时用方向B, 其他回退旧法
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

// 测试两种策略: A=全N4走方向B(当前), B=仅纯上风走方向B
console.log('=== 策略对比 ===');
console.log('\n策略A: 全N4走方向B(当前文件)');
console.log('策略B: 仅纯上风(|cosW|<0.15)走方向B, 其他回退旧法');
console.log('');
// 策略A(当前)
let sA={n4:{ok:0,n:0,sA:0,sP:0}};
for(const d of data){
  if(d.n!==4||d.distance<0)continue;
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);
  const all=api.searchTrico3in1Physics(d.distance,20,dir,wa,d.windStrength,(d.elevation||0)*EP);
  const r=(all||[]).find(x=>x.spinN===4);
  sA.n4.n++;
  if(r){sA.n4.ok++;sA.n4.sA+=Math.abs(r.angle-d.angle);sA.n4.sP+=Math.abs(r.power-d.power);}
}
console.log(`策略A N4: ${sA.n4.ok}/${sA.n4.n} dA=${(sA.n4.sA/sA.n4.ok).toFixed(2)} dP=${(sA.n4.sP/sA.n4.ok).toFixed(3)}`);

// 图片场景(策略A)
const imgA=api.searchTrico3in1Physics(33,20,'left',90,12,0);
const n4A=(imgA||[]).find(x=>x.spinN===4);
console.log(`图片(策略A): ${n4A?n4A.angle.toFixed(2)+'/'+n4A.power.toFixed(3):'NULL'} (实测70/3.81)`);

// 8标准点(策略A)
console.log('8标准点(策略A):');
for(const t of [{s:'右',sd:10,ws:20,a:84.4,p:3.86},{s:'左',sd:10,ws:20,a:83.6,p:3.35},{s:'左',sd:30,ws:20,a:70,p:3.46}]){
  const dir=t.s==='右'?'right':'left';
  const all=api.searchTrico3in1Physics(t.sd,20,dir,90,t.ws,0);
  const r=(all||[]).find(x=>x.spinN===4);
  console.log(`  ${t.s}${t.sd}: ${r?r.angle.toFixed(2)+'/'+r.power.toFixed(3):'NULL'} (实测${t.a}/${t.p})`);
}
