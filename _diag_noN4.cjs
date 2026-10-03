// 确认 dist=10 elev=0 wa=56 ws=26 右攻 为何 N3/N4 无结果. 用法: node _diag_noN4.cjs
const fs=require('fs'), vm=require('vm');
const s=fs.readFileSync('gunbound_calculator.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const fe=()=>({value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},getAttribute(){return null;},appendChild(){},removeChild(){},querySelectorAll(){return[];},querySelector(){return fe();},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},getContext(){return{scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return{width:0};},createLinearGradient(){return{addColorStop(){}};},setLineDash(){},drawImage(){}};},options:[],children:[],innerHTML:'',checked:false,parentElement:null,focus(){},blur(){},click(){},scrollIntoView(){}});
const sb={document:{getElementById(){return fe();},querySelector(){return fe();},querySelectorAll(){return[];},createElement(){return fe();},addEventListener(){},documentElement:{setAttribute(){}},visibilityState:'visible'},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},window:{},requestAnimationFrame(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},addEventListener(){},removeEventListener(){},alert(){},prompt(){return null;},confirm(){return false;},console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,Array,Object,String,Boolean,PI:Math.PI,Event:function(){},CustomEvent:function(){},getComputedStyle(){return{getPropertyValue(){return'';}};},matchMedia(){return{matches:false,addEventListener(){}};},innerWidth:1280,innerHeight:800,devicePixelRatio:1,location:{href:'',search:''}};
sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(s+';globalThis.__api={searchTrico3in1Physics,EXCEL_TRICO};',sb,{filename:'c.js',timeout:30000});
const {searchTrico3in1Physics,EXCEL_TRICO}=sb.__api;

const dist=10, elevUI=0, wa=56, ws=26, EPPU=516/13;
console.log('=== searchTrico3in1Physics 实际返回 ===');
const all=searchTrico3in1Physics(dist,20,'right',wa,ws,elevUI*EPPU);
for(const n of [1,2,3,4]){
  const r=(all||[]).find(x=>x.spinN===n);
  console.log(`  N${n}: ${r?`${r.angle.toFixed(1)}°/${r.power.toFixed(3)} [${r.source}]`:'无结果(null)'}`);
}

// 手动复现 calcTimePhysicsSolver 的关键中间量
console.log('\n=== 手动追踪 calcTimePhysicsSolver 中间量 ===');
const PF=0.004332712, MASS=0.23, G=430;
const Tfit={2:{a:2.8655,b:-0.01427},3:{a:4.1243,b:-0.01039},4:{a:5.1541,b:-0.00462}};
const wr=wa*Math.PI/180, cosW=Math.cos(wr), sinW=Math.sin(wr);
const force=Math.max(0,ws-1);
const xA=cosW*force/MASS, effGrav=G-sinW*force/MASS, wy_acc=sinW*force/MASS, dT=0.0243-0.00066*wy_acc;
const xDist=dist*40;
console.log(`风: cosW=${cosW.toFixed(3)} sinW=${sinW.toFixed(3)} force=${force} xA=${xA.toFixed(1)} effGrav=${effGrav.toFixed(1)} dT=${dT.toFixed(4)}`);
console.log(`xDist=${xDist}px (=${dist}SD)`);
for(const n of [2,3,4]){
  const T=Tfit[n].a+Tfit[n].b*dist+dT;
  const half_xA_T2=0.5*xA*T*T;
  const denom=xDist-half_xA_T2;
  const tanA=(0+0.5*effGrav*T*T)/denom;
  const ang=Math.atan(tanA)*180/Math.PI;
  console.log(`  N${n}: T=${T.toFixed(3)} | 风水平漂移0.5·xA·T²=${half_xA_T2.toFixed(0)}px(${(half_xA_T2/40).toFixed(1)}SD) | denom=xDist−漂移=${denom.toFixed(0)} ${denom<0?'←负!':''} | tanA=${tanA.toFixed(2)} angleRaw=${ang.toFixed(1)}° ${ang<1?'←<1°返回null':''}`);
}
