// 检查: 加落差+风后, 修正(xErrSD)是否仍生效, 还是回退到旧路径("变回去")
// 对比 current(v1.11) vs clean(v1.08), 看 source(路径) + 角度是否真的改了. 用法: node _check_elev.cjs
const fs=require('fs'), vm=require('vm');
function loadApi(p){
  const s=fs.readFileSync(p,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe=()=>({value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},getAttribute(){return null;},appendChild(){},removeChild(){},querySelectorAll(){return[];},querySelector(){return fe();},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},getContext(){return{scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return{width:0};},createLinearGradient(){return{addColorStop(){}};},setLineDash(){},drawImage(){}};},options:[],children:[],innerHTML:'',checked:false,parentElement:null,focus(){},blur(){},click(){},scrollIntoView(){}});
  const sb={document:{getElementById(){return fe();},querySelector(){return fe();},querySelectorAll(){return[];},createElement(){return fe();},addEventListener(){},documentElement:{setAttribute(){}},visibilityState:'visible'},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},window:{},requestAnimationFrame(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},addEventListener(){},removeEventListener(){},alert(){},prompt(){return null;},confirm(){return false;},console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,Array,Object,String,Boolean,PI:Math.PI,Event:function(){},CustomEvent:function(){},getComputedStyle(){return{getPropertyValue(){return'';}};},matchMedia(){return{matches:false,addEventListener(){}};},innerWidth:1280,innerHeight:800,devicePixelRatio:1,location:{href:'',search:''}};
  sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
  vm.runInContext(s+';globalThis.__api={searchTrico3in1Physics};',sb,{filename:p,timeout:30000});
  return sb.__api;
}
const EPPU=516/13;
const now=loadApi('gunbound_calculator.html');
const clean=loadApi('gunbound_calculator.before_right3_anchor.html');
function shorten(src){ if(!src)return '?'; if(src.includes('落地时间'))return '求解器✓'; if(src.includes('识别表'))return '识别表'; return src+'⚠回退'; }

function test(side, n, dist, wa){
  console.log(`\n=== ${side==='right'?'右':'左'} N${n}  dist=${dist} 风向=${wa} ===`);
  console.log('风力 落差 | 修后 A/P     源           | 修前(v1.08) A/P | Δ角度(修后-修前)');
  for(const ws of [0,16]){
    for(const elev of [0,-1,-2,-3,-5,2]){
      const eff = side==='left'?((180-wa)%360+360)%360:wa;
      const rn=(now.searchTrico3in1Physics(dist,20,side,eff,ws,elev*EPPU)||[]).find(r=>r.spinN===n);
      const rc=(clean.searchTrico3in1Physics(dist,20,side,eff,ws,elev*EPPU)||[]).find(r=>r.spinN===n);
      const na=rn?`${rn.angle.toFixed(1)}/${rn.power.toFixed(3)}`:'null';
      const ca=rc?`${rc.angle.toFixed(1)}/${rc.power.toFixed(3)}`:'null';
      const dA = (rn&&rc)?(rn.angle-rc.angle):null;
      const flag = (dA!==null && Math.abs(dA)<0.01 && !(ws===0&&elev===0))?' ←未变!':'';
      console.log(`${String(ws).padStart(3)} ${String(elev).padStart(4)} | ${na.padEnd(12)} ${shorten(rn&&rn.source).padEnd(11)} | ${ca.padEnd(12)} | ${dA!==null?(dA>=0?'+':'')+dA.toFixed(2):'-'}${flag}`);
    }
  }
}
test('right',3,20,118);
test('right',2,20,118);
test('right',4,20,90);
test('left',3,25,118);
