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

const ts=EX.calcTimePhysicsSolver(20,'right',3,20,0,338,26);
console.log('timeSolver =', ts?ts.angle.toFixed(2)+'/'+ts.power.toFixed(3)+' T='+ts.time.toFixed(3):'NULL');

// 手算每步, 找卡点
const G=430,MASS=0.23,PF=0.004332712,sdParts=20,dist=20,elev=0,wa=338,ws=26;
const sd=dist;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS,wy_acc=sinW*force/MASS;
const xDist=sd*(800/sdParts);
const fit={a:4.1243,b:-0.01039};
const T_base=fit.a+fit.b*sd;
const dT=0.0243-0.00066*wy_acc;
const T_target=T_base+dT;
const effGravCalc=G-wy_acc;  // N3: G_base=G=430
const halfEffG_T2=0.5*effGravCalc*T_target*T_target;
const half_xA_T2=0.5*xA*T_target*T_target;
const denom=xDist-half_xA_T2;
console.log(`step: T_target=${T_target.toFixed(4)} denom=${denom.toFixed(4)} (abs<0.001? ${Math.abs(denom)<0.001})`);
const tanA=(elev+halfEffG_T2)/denom;
const angleRaw=Math.atan(tanA)*180/Math.PI;
console.log(`step: tanA=${tanA.toFixed(2)} angleRaw=${angleRaw.toFixed(4)} (>89.5? ${angleRaw>89.5})`);
const cosA_raw=Math.cos(angleRaw*Math.PI/180);
const sinA_raw=Math.sin(angleRaw*Math.PI/180);
console.log(`step: cosA_raw=${cosA_raw.toFixed(6)} sinA_raw=${sinA_raw.toFixed(6)} (cosA<=0.001? ${cosA_raw<=0.001})`);
const V_raw=denom/(cosA_raw*T_target);
const powerRaw=+(V_raw*PF).toFixed(4);
console.log(`step: V_raw=${V_raw.toFixed(1)} powerRaw=${powerRaw} (>5? ${powerRaw>5})`);
