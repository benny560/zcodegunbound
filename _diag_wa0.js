// 砍掉cap后, wa=0纯顺风场景会怎样? 注释说这场景回退重推物理会3.65->3.32跳变
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

// 手算砍cap后的 T_uncapped 和 denom, 看 wa=0 纯顺风场景denom会不会<=0
console.log('砍cap后, 纯顺风大风场景 denom 是否撑得住:');
console.log('wa ws dist | T_uncapped T_max   denom   angle(若denom>0)');
const G=430,MASS=0.23;
const fit={a:4.1243,b:-0.01039};
for(const [wa,ws,dist] of [[0,24,20],[0,26,20],[0,24,15],[0,22,20],[10,24,20],[350,26,20],[0,26,25]]){
  const sd=dist;
  const wr=wa*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
  const force=Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1);
  const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS, wy_acc=sinW*force/MASS;
  const xDist=sd*40;
  const T_base=fit.a+fit.b*sd;
  const dT=0.0243-0.00066*wy_acc;
  const T_unc=T_base+dT;
  const T_max=Math.sqrt(2*xDist/xA);
  const denom=xDist-0.5*xA*T_unc*T_unc;
  let angStr='denom<=0 失效';
  if(denom>0.001){
    const tanA=(0+0.5*effGrav*T_unc*T_unc)/denom;
    if(tanA>0){const ang=Math.atan(tanA)*180/Math.PI; angStr=ang.toFixed(2)+'deg';}
  }
  console.log(`${String(wa).padStart(3)} ${String(ws).padStart(2)} ${String(dist).padStart(4)} | ${T_unc.toFixed(3).padStart(7)} ${T_max.toFixed(3).padStart(6)} ${denom.toFixed(1).padStart(6)}  ${angStr}`);
}
