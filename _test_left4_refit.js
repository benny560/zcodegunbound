// 测试 left:4 用新系数 4.5933-0.00545·sd 的效果
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('gunbound_calculator.html','utf8');
let sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// 替换 left:4 系数
sb=sb.replace("'left:4':  {a: 4.8190, b: -0.0180}","'left:4':  {a: 4.5933, b: -0.00545}");
const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics};',sandbox,{filename:'c.js'});
const api=sandbox.__api;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const EP=516/13,effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
// N4左攻样本逐个对比
console.log('=== N4左攻: 新系数效果 ===');
console.log('sd    wa ws | realA/realP | 新pred A/P          err');
let maeA=0,maeP=0,n=0;
for(const d of data){
  if(d.n!==4||d.side!=='左'||d.distance<0)continue;
  const wa=effWa(d.side,d.windAngle);
  const all=api.searchTrico3in1Physics(d.distance,20,'left',wa,d.windStrength,(d.elevation||0)*EP);
  const r=all.find(x=>x.spinN===4);
  if(!r){console.log(`${d.distance} NULL`);continue;}
  const eA=r.angle-d.angle, eP=r.power-d.power;
  maeA+=Math.abs(eA);maeP+=Math.abs(eP);n++;
  console.log(`${String(d.distance).padStart(5)} ${String(wa).padStart(3)} ${String(d.windStrength).padStart(2)} | ${String(d.angle).padStart(3)}/${d.power.toFixed(2)} | ${r.angle.toFixed(1)}/${r.power.toFixed(2)}  ${(eA>=0?'+':'')+eA.toFixed(1)}°/${(eP>=0?'+':'')+eP.toFixed(2)}`);
}
console.log(`N4左攻 MAE: dA=${(maeA/n).toFixed(2)}° dP=${(maeP/n).toFixed(3)} (n=${n})`);
// 图片场景
console.log('\n=== 图片场景(左4 sd=33 wa=90 ws=12) ===');
const img=api.searchTrico3in1Physics(33,20,'left',90,12,0);
const n4=img.find(x=>x.spinN===4);
console.log('新:', n4?n4.angle.toFixed(2)+'/'+n4.power.toFixed(4)+' T='+n4.T.toFixed(3):'NULL');
console.log('旧: 68.78/3.7460 T=4.218');
console.log('实测附近(sd=33 wa=68 ws=11): 69/4.0');
