// 检查 left:3(右打左N3): 识别(表) vs 求解(落地时间求解器) 无风下是否用同一套数据
// 顺带对比 right:3(左打右, 已加xErrSD). 用法: node _check_leftN3.cjs
const fs=require('fs'), vm=require('vm');
const s=fs.readFileSync('gunbound_calculator.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const fe=()=>({value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},getAttribute(){return null;},appendChild(){},removeChild(){},querySelectorAll(){return[];},querySelector(){return fe();},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},getContext(){return{scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return{width:0};},createLinearGradient(){return{addColorStop(){}};},setLineDash(){},drawImage(){}};},options:[],children:[],innerHTML:'',checked:false,parentElement:null,focus(){},blur(){},click(){},scrollIntoView(){}});
const sb={document:{getElementById(){return fe();},querySelector(){return fe();},querySelectorAll(){return[];},createElement(){return fe();},addEventListener(){},documentElement:{setAttribute(){}},visibilityState:'visible'},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},window:{},requestAnimationFrame(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},addEventListener(){},removeEventListener(){},alert(){},prompt(){return null;},confirm(){return false;},console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,Array,Object,String,Boolean,PI:Math.PI,Event:function(){},CustomEvent:function(){},getComputedStyle(){return{getPropertyValue(){return'';}};},matchMedia(){return{matches:false,addEventListener(){}};},innerWidth:1280,innerHeight:800,devicePixelRatio:1,location:{href:'',search:''}};
sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(s+';globalThis.__api={EXCEL_TRICO};',sb,{filename:'c.js',timeout:30000});
const E=sb.__api.EXCEL_TRICO;
const PF=0.004332712, G=430;

function check(side, label){
  console.log(`\n===== ${label} (${side}:3) 无风: 识别表 vs 求解器 =====`);
  console.log('sd | 识别表(识别) A/P     T_由表反推 | 求解器(求解) A/P    T_fit | ΔA    ΔP');
  const Tfit = E.timePhysicsNoWindT[`${side}:3`];
  for(const sd of [15,20,25,30,35,40,45,49]){
    const anc = E.getEmpiricalPhaseAnchor(side, 3, sd);   // 识别表
    if(!anc){ console.log(`${sd} | 表无`); continue; }
    // 表反推的无风T
    const V=anc.power/PF, Ttab = 2*V*Math.sin(anc.angle*Math.PI/180)/G;
    // 求解器无风(ws=0, elev=0)
    const sol = E.calcTimePhysicsSolver(20, side, 3, sd, 0, 0, 0);
    const Tf = Tfit ? Tfit.a + Tfit.b*sd : null;
    if(!sol){ console.log(`${sd} | ${anc.angle.toFixed(1)}/${anc.power.toFixed(2)}  Ttab=${Ttab.toFixed(3)} | 求解null`); continue; }
    const dA=sol.angle-anc.angle, dP=sol.power-anc.power;
    console.log(`${String(sd).padStart(2)} | ${anc.angle.toFixed(1).padStart(4)}/${anc.power.toFixed(3)}  Ttab=${Ttab.toFixed(3)} | ${sol.angle.toFixed(1).padStart(4)}/${sol.power.toFixed(3)}  Tfit=${Tf.toFixed(3)} | ${(dA>=0?'+':'')+dA.toFixed(2)} ${(dP>=0?'+':'')+dP.toFixed(3)}`);
  }
}
check('left', '右打左 N3');
check('right','左打右 N3(已加xErrSD)');
