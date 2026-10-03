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

// Image case N3: trace why null
const ts=EX.calcTimePhysicsSolver(20,'right',3,20,0,338,26);
console.log('timeSolver N3 =', ts?ts.angle.toFixed(2)+'/'+ts.power.toFixed(3):'NULL');
// 手算denom
const G=430,MASS=0.23,sdParts=20,dist=20,wa=338,ws=26;
const wr=wa*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS,effGrav=G-sinW*force/MASS,wy_acc=sinW*force/MASS;
const xDist=dist*40;
const T_base=4.1243-0.01039*dist;
const T_target=T_base+(0.0243-0.00066*wy_acc);
const denom=xDist-0.5*xA*T_target*T_target;
const tanA=(0+0.5*effGrav*T_target*T_target)/denom;
const ang=Math.atan(tanA)*180/Math.PI;
console.log(`手算: T_target=${T_target.toFixed(4)} denom=${denom.toFixed(2)} tanA=${tanA.toFixed(2)} angle=${ang.toFixed(2)}`);
console.log(`  effGrav=${effGrav.toFixed(2)} (effGravCalc 在solver里是 G_base - sinW*force/MASS, N3用G_base=G=430)`);
// 关键: solver里 effGravCalc = G_base - sinW*force/MASS, G_base=G=430
// 但这里 sinW<0 (338度), 所以 effGravCalc = 430 - (-0.37)*25/0.23 = 430 + 40 = 470
// 我手算用了 effGrav=470? 检查
console.log(`  sinW=${sinW.toFixed(4)} force=${force} => effGravCalc=430-${(sinW*force/MASS).toFixed(2)}=${(430-sinW*force/MASS).toFixed(2)}`);
// 看看后续检查
const cosA=Math.cos(ang*Math.PI/180),sinA=Math.sin(ang*Math.PI/180);
const V=denom/(cosA*T_target);
const power=V*0.004332712;
console.log(`  V=${V.toFixed(1)} power=${power.toFixed(3)} cosA=${cosA.toFixed(4)} sinA=${sinA.toFixed(4)}`);
// 落点验证
const vx=V*cosA;
const xLand=vx*T_target+0.5*xA*T_target*T_target;
console.log(`  xLand=${xLand.toFixed(1)} xDist=${xDist} xErr=${Math.abs(xLand-xDist).toFixed(1)}`);
console.log(`  MAX_DISPLAY_POWER检查: power=${power.toFixed(3)} <= 5? ${power<=5}`);
