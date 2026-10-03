// 验证真实修改后HTML(v1.10 xErrSD): 全量落点对比 + 左/N1不变 + 无风连续 + 截图场景
// 用法: node _verify_integrated.cjs
const fs=require('fs'), vm=require('vm');
function loadApi(p){
  const s=fs.readFileSync(p,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const fe=()=>({value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},getAttribute(){return null;},appendChild(){},removeChild(){},querySelectorAll(){return[];},querySelector(){return fe();},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},getContext(){return{scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return{width:0};},createLinearGradient(){return{addColorStop(){}};},setLineDash(){},drawImage(){}};},options:[],children:[],innerHTML:'',checked:false,parentElement:null,focus(){},blur(){},click(){},scrollIntoView(){}});
  const sb={document:{getElementById(){return fe();},querySelector(){return fe();},querySelectorAll(){return[];},createElement(){return fe();},addEventListener(){},documentElement:{setAttribute(){}},visibilityState:'visible'},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},window:{},requestAnimationFrame(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},addEventListener(){},removeEventListener(){},alert(){},prompt(){return null;},confirm(){return false;},console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,Array,Object,String,Boolean,PI:Math.PI,Event:function(){},CustomEvent:function(){},getComputedStyle(){return{getPropertyValue(){return'';}};},matchMedia(){return{matches:false,addEventListener(){}};},innerWidth:1280,innerHeight:800,devicePixelRatio:1,location:{href:'',search:''}};
  sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
  vm.runInContext(s+';globalThis.__api={searchTrico3in1Physics};',sb,{filename:p,timeout:30000});
  return sb.__api;
}
const PF=0.004332712, EPPU=516/13;
const now=loadApi('gunbound_calculator.html');                        // v1.10 xErrSD
const old=loadApi('gunbound_calculator.before_right3_anchor.html');   // 干净 v1.08
const data=JSON.parse(fs.readFileSync('_excel_real.json','utf8'));
function effWa(d){ return d.side==='左'?((180-d.windAngle)%360+360)%360:d.windAngle; }
function sk(d){ return d.side==='右'?'right':'left'; }
function landOf(angle,power,xA,g,elevPx){ const V=power/PF,a=angle*Math.PI/180,vy=V*Math.sin(a),vx=V*Math.cos(a);const disc=vy*vy-2*g*elevPx;if(disc<0)return null;const T=(vy+Math.sqrt(disc))/g;return vx*T+0.5*xA*T*T; }
function get(api,d){ const all=api.searchTrico3in1Physics(Math.abs(d.distance),20,sk(d),effWa(d),d.windStrength,(d.elevation||0)*EPPU);return (all||[]).find(r=>r.spinN===d.n)||null; }

// ---- 1. 全量落点对比 (修前=old 修后=now) ----
console.log('== 1. 全量落点偏差 vs实测 (真实求解器; 正射) ==');
console.log('侧 N | n | 修前|miss| 修后|miss|');
const agg={};
for(const d of data){
  if(d.distance<=0) continue;
  const key=`${sk(d)}:${d.n}`; (agg[key]=agg[key]||[]).push(d);
}
for(const side of['right','left'])for(const n of[1,2,3,4]){
  const sub=(agg[`${side}:${n}`]||[]); if(!sub.length)continue;
  let mb=0,ma=0,cb=0,ca=0;
  for(const d of sub){
    const elevPx=(d.elevation||0)*EPPU;
    const ro=get(old,d), rn=get(now,d);
    if(ro){const lr=landOf(d.angle,d.power,ro.centerResult.xA,ro.centerResult.effectiveGravity,elevPx),ls=landOf(ro.angle,ro.power,ro.centerResult.xA,ro.centerResult.effectiveGravity,elevPx);if(lr!=null&&ls!=null){mb+=Math.abs((ls-lr)/40);cb++;}}
    if(rn){const lr=landOf(d.angle,d.power,rn.centerResult.xA,rn.centerResult.effectiveGravity,elevPx),ls=landOf(rn.angle,rn.power,rn.centerResult.xA,rn.centerResult.effectiveGravity,elevPx);if(lr!=null&&ls!=null){ma+=Math.abs((ls-lr)/40);ca++;}}
  }
  console.log(`${side==='right'?'右':'左'} N${n} | ${String(sub.length).padStart(2)} | ${(cb?mb/cb:0).toFixed(2).padStart(6)}   ${(ca?ma/ca:0).toFixed(2).padStart(6)}`);
}

// ---- 2. 左侧/N1 是否完全不变 ----
console.log('\n== 2. 左侧+右N1 逐条 修前后差异(应全为0) ==');
let maxDiff=0,changed=0;
for(const d of data){
  if(d.distance<=0)continue;
  if(!(sk(d)==='left' || (sk(d)==='right'&&d.n===1)))continue;
  const ro=get(old,d),rn=get(now,d);
  if(ro&&rn){const dA=Math.abs(ro.angle-rn.angle),dP=Math.abs(ro.power-rn.power);if(dA>1e-6||dP>1e-6){changed++;}maxDiff=Math.max(maxDiff,dA,dP);}
}
console.log(`  左侧+右N1: 变化条数=${changed}, 最大差异=${maxDiff.toExponential(1)} (应=0)`);

// ---- 3. 无风连续性: 右N3 sd=20 elev 0/-0.5/-1/-2 (elev=0走识别表=75.8) ----
console.log('\n== 3. 无风连续性 右N3 sd=20 (elev=0走识别表基准75.8/3.74) ==');
for(const e of[0,-0.5,-1,-2,1]){
  const all=now.searchTrico3in1Physics(20,20,'right',0,0,e*EPPU);
  const r=(all||[]).find(x=>x.spinN===3);
  console.log(`  elev=${String(e).padStart(4)}: ${r?`${r.angle.toFixed(2)}° / ${r.power.toFixed(3)}  [${r.source}]`:'null'}`);
}

// ---- 4. 截图场景 ----
console.log('\n== 4. 截图场景 dist=19.8 elev=-5.5 wa=118 ws=16 右攻 ==');
for(const n of[2,3]){
  const ro=get({searchTrico3in1Physics:old.searchTrico3in1Physics},{distance:19.8,elevation:-5.5,windAngle:118,windStrength:16,side:'右',n});
  const rn=get({searchTrico3in1Physics:now.searchTrico3in1Physics},{distance:19.8,elevation:-5.5,windAngle:118,windStrength:16,side:'右',n});
  console.log(`  N${n}: 修前 ${ro?ro.angle.toFixed(1)+'°/'+ro.power.toFixed(3):'-'}  ->  修后 ${rn?rn.angle.toFixed(1)+'°/'+rn.power.toFixed(3):'-'}`);
}
