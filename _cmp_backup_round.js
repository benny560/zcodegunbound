// 用 v1.05 备份文件(bugB_after) 跑同一个场景, 看取整解是不是3.1956
const fs=require('fs'),vm=require('vm');
for(const f of ['gunbound_calculator.bugB_after.html','gunbound_calculator.before_rightN3_recal.html']){
  const html=fs.readFileSync(f,'utf8');
  const sb=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const fakeEl = () => ({ value: '', textContent: '', style: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){return false;} }, setAttribute(){}, getAttribute(){return null;}, appendChild(){}, removeChild(){}, querySelectorAll(){return [];}, querySelector(){return fakeEl();}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return true;}, getContext(){return {scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return {width:0};},createLinearGradient(){return {addColorStop(){}};},setLineDash(){},setFont(){},drawImage(){}};}, options: [], children: [], innerHTML: '', checked: false, parentElement: null, focus(){}, blur(){}, click(){}, scrollIntoView(){} });
  const documentStub = { getElementById(){return fakeEl();}, querySelector(){return fakeEl();}, querySelectorAll(){return [];}, createElement(){return fakeEl();}, addEventListener(){}, documentElement: { setAttribute(){} }, visibilityState: 'visible' };
  const sandbox = { document: documentStub, localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, navigator: {}, requestAnimationFrame(){}, setTimeout, clearTimeout, setInterval: ()=>0, clearInterval: ()=>0, addEventListener(){}, removeEventListener(){}, alert(){}, prompt(){return null;}, confirm(){return false;}, console, Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, Number, Array, Object, String, Boolean, Event: function(){}, CustomEvent: function(){}, getComputedStyle(){return { getPropertyValue(){return '';} };}, matchMedia(){return {matches:false, addEventListener(){}};}, innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1, location: {href:'', search:''} };
  sandbox.window = sandbox; sandbox.self = sandbox; sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  try{
    vm.runInContext(sb+';globalThis.__api={searchTrico3in1Physics};',sandbox,{filename:'c.js'});
    const api=sandbox.__api;
    const EP=516/13,PF=0.004332712;
    const all=api(5,20,'right',157,18,-1*EP);
    const n3=all.find(r=>r.spinN===3);
    if(!n3){console.log(`${f}: N3 NULL`);continue;}
    const cr=n3.centerResult;
    const rawA=n3.angle,rawP=n3.power,T_raw=parseFloat(cr.time);
    const xA=parseFloat(cr.xA)||0,effGrav=parseFloat(cr.effectiveGravity)||430;
    const rawV=rawP/PF;
    const cosRaw=Math.cos(rawA*Math.PI/180),sinRaw=Math.sin(rawA*Math.PI/180);
    const xT=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw;
    const yT=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
    console.log(`\n=== ${f} ===`);
    console.log(`raw=${rawA.toFixed(4)}/${rawP}/${T_raw} src=${n3.source}`);
    for(const a of [Math.floor(rawA+1e-9),Math.ceil(rawA-1e-9)]){
      const tanT=Math.tan(a*Math.PI/180),cosT=Math.cos(a*Math.PI/180);
      const T2=2*(tanT*xT-yT)/(effGrav+xA*tanT);
      const T_new=Math.sqrt(T2);
      const V_new=(xT-0.5*xA*T_new*T_new)/(cosT*T_new);
      const p=V_new*PF;
      const dT=Math.abs(T_new-T_raw);
      console.log(`  ${a}°: power=${p.toFixed(4)} dT=${dT.toFixed(4)} ${dT>0.12?'⚠':'ok'}`);
    }
  }catch(e){console.log(`${f}: ERROR ${e.message}`);}
}
