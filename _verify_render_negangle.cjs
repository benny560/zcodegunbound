// 验证下游 powerAtIntegerAngle 对负角/反向角不产生NaN. 用真实solver结果+复刻取整逻辑.
// 用法: node _verify_render_negangle.cjs
const fs=require('fs'), vm=require('vm');
const s=fs.readFileSync('gunbound_calculator.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const fe=()=>({value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},getAttribute(){return null;},appendChild(){},removeChild(){},querySelectorAll(){return[];},querySelector(){return fe();},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},getContext(){return{scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return{width:0};},createLinearGradient(){return{addColorStop(){}};},setLineDash(){},drawImage(){}};},options:[],children:[],innerHTML:'',checked:false,parentElement:null,focus(){},blur(){},click(){},scrollIntoView(){}});
const sb={document:{getElementById(){return fe();},querySelector(){return fe();},querySelectorAll(){return[];},createElement(){return fe();},addEventListener(){},documentElement:{setAttribute(){}},visibilityState:'visible'},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},window:{},requestAnimationFrame(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},addEventListener(){},removeEventListener(){},alert(){},prompt(){return null;},confirm(){return false;},console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,Array,Object,String,Boolean,PI:Math.PI,Event:function(){},CustomEvent:function(){},getComputedStyle(){return{getPropertyValue(){return'';}};},matchMedia(){return{matches:false,addEventListener(){}};},innerWidth:1280,innerHeight:800,devicePixelRatio:1,location:{href:'',search:''}};
sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(s+';globalThis.__api={searchTrico3in1Physics};',sb,{filename:'c.js',timeout:30000});
const {searchTrico3in1Physics}=sb.__api;
const EPPU=516/13, sdPartsVal=20;

// 复刻 powerAtIntegerAngle (行7683-7731)
function powerAtIntegerAngle(sol, cr, rawA, targetAngle){
  const T_raw=parseFloat(cr.time), xA=parseFloat(cr.xA)||0, effGrav=parseFloat(cr.effectiveGravity)||430;
  if(!(T_raw>0)||effGrav<=0) return null;
  const PF=0.004332712, rawV=sol.powerRaw/PF;
  const cosRaw=Math.cos(rawA*Math.PI/180), sinRaw=Math.sin(rawA*Math.PI/180);
  const xTarget=rawV*cosRaw*T_raw+0.5*xA*T_raw*T_raw, yTarget=rawV*sinRaw*T_raw-0.5*effGrav*T_raw*T_raw;
  const tol={1:0.05,2:0.08,3:0.12,4:0.15}[sol.spinN]||0.12;
  const tanT=Math.tan(targetAngle*Math.PI/180), cosT=Math.cos(targetAngle*Math.PI/180);
  const denom=effGrav+xA*tanT; let landingPower=null;
  if(denom>0&&isFinite(denom)){const T2=2*(tanT*xTarget-yTarget)/denom;if(T2>0&&isFinite(T2)){const T_new=Math.sqrt(T2);const V_new=(xTarget-0.5*xA*T_new*T_new)/(cosT*T_new);if(V_new>0&&V_new<2000){const p=V_new*PF;if(Number.isFinite(p)&&p>0&&p<7){landingPower={power:p,dT:Math.abs(T_new-T_raw)};}}}}
  if(landingPower&&landingPower.dT<=tol) return landingPower.power;
  const sinT=Math.sin(targetAngle*Math.PI/180);
  if(sinT<=0.001) return landingPower?{power:landingPower.power,tConserved:false}:null;
  const V_tc=(yTarget+0.5*effGrav*T_raw*T_raw)/(sinT*T_raw);
  if(!(V_tc>0&&V_tc<2000)) return landingPower?{power:landingPower.power,tConserved:false}:null;
  const p_tc=V_tc*PF;
  if(!(Number.isFinite(p_tc)&&p_tc>0&&p_tc<7)) return landingPower?{power:landingPower.power,tConserved:false}:null;
  const xLand_tc=V_tc*cosT*T_raw+0.5*xA*T_raw*T_raw, xErrSD=(xLand_tc-xTarget)/(800/sdPartsVal);
  return {power:p_tc,tConserved:true,xErrSD};
}
function chk(label,dist,elev,wa,ws){
  console.log('\n'+label);
  const all=searchTrico3in1Physics(dist,20,'right',wa,ws,elev*EPPU);
  for(const n of [1,2,3,4]){
    const res=(all||[]).find(x=>x.spinN===n); if(!res){console.log(`  N${n}: 无解`);continue;}
    const cr=res.centerResult, rawA=res.angle;                 // 顶层angle=raw浮点
    const sol={powerRaw:cr.powerRaw, spinN:res.spinN, power:res.power};
    const aFloor=Math.floor(rawA), aCeil=Math.ceil(rawA);
    const pf=powerAtIntegerAngle(sol,cr,rawA,aFloor), pc=powerAtIntegerAngle(sol,cr,rawA,aCeil);
    const fmt=(p)=>p==null?'null':(typeof p==='object'?`${p.power.toFixed(3)}${p.tConserved?'(T守恒,落点偏'+p.xErrSD.toFixed(2)+'SD)':''}`:p.toFixed(3));
    const ok=(p)=>p!=null&&Number.isFinite(typeof p==='object'?p.power:p);
    console.log(`  N${n}: raw=${rawA.toFixed(1)}°/${res.power.toFixed(3)} | 取整解↓${aFloor}°=${fmt(pf)} ↑${aCeil}°=${fmt(pc)} | ${ok(pf)&&ok(pc)?'✓有限':'✗NaN/null!'}`);
  }
}
chk('dist=20 落差-15 无风 (N1负角):', 20, -15, 0, 0);
chk('dist=10 风56 风力26 (N3/N4反向角):', 10, 0, 56, 26);
