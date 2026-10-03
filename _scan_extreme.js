// 扫描极端场景, 确认去掉角度上限后没有病态解(>89.9或power异常)
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
let maxAng=0, cnt89=0, cntNull=0, badPower=0;
const extreme=[];
for(const side of ['right','left']){
  for(const n of [1,2,3,4]){
    for(const dist of [3,8,13,18,23,30,40]){
      for(const wa of [0,45,90,135,180,225,270,315,338,350]){
        for(const ws of [0,8,15,22,26]){
          for(const elev of [-3,0,3]){
            const r=EX.calcWithWind(20,side,n,dist,elev*(516/13),wa,ws);
            if(!r){cntNull++;continue;}
            if(r.angle>maxAng)maxAng=r.angle;
            if(r.angle>89)cnt89++;
            if(r.power>4.9||r.power<0.5)badPower++;
            if(r.angle>89.5||r.power>4.8)extreme.push(`${side}N${n} d=${dist} wa=${wa} ws=${ws} e=${elev} -> ${r.angle.toFixed(1)}/${r.power.toFixed(2)}`);
          }
        }
      }
    }
  }
}
console.log(`扫描完成: 最大角度=${maxAng.toFixed(2)}, >89°的有${cnt89}个, power异常(>4.9或<0.5)${badPower}个, NULL ${cntNull}个`);
console.log(`\n角度>89.5 或 power>4.8 的极端解(${extreme.length}个):`);
extreme.slice(0,25).forEach(s=>console.log('  '+s));
if(extreme.length>25)console.log('  ...还有'+(extreme.length-25)+'个');
console.log('\n=== power 分布(确认没超MAX=5的病态) ===');
