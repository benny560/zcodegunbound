// 验证 atan2 改动: 67条正向样本零影响 + 负角/反向角新场景返回. 用法: node _verify_negangle.cjs
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
const now=loadApi('gunbound_calculator.html');                  // v1.13 atan2
const old=loadApi('gunbound_calculator.before_negangle.html');  // v1.12 atan
const data=JSON.parse(fs.readFileSync('_excel_real.json','utf8'));
function eff(d){return d.side==='左'?((180-d.windAngle)%360+360)%360:d.windAngle;}
function sk(d){return d.side==='右'?'right':'left';}

// 1. 67条正向样本: 逐条对比
let changed=0, maxdA=0, maxdP=0;
for(const d of data){
  const dir=sk(d);
  const rn=(now.searchTrico3in1Physics(Math.abs(d.distance),20,dir,eff(d),d.windStrength,(d.elevation||0)*EPPU)||[]).find(r=>r.spinN===d.n);
  const ro=(old.searchTrico3in1Physics(Math.abs(d.distance),20,dir,eff(d),d.windStrength,(d.elevation||0)*EPPU)||[]).find(r=>r.spinN===d.n);
  if(!rn&&!ro) continue;
  if(!rn||!ro){ changed++; console.log('  出现/消失差异:', d.distance, d.side, 'N'+d.n, ro?'旧有':'旧无', rn?'新有':'新无'); continue; }
  const dA=Math.abs(rn.angle-ro.angle), dP=Math.abs(rn.power-ro.power);
  maxdA=Math.max(maxdA,dA); maxdP=Math.max(maxdP,dP);
  if(dA>0.005||dP>0.001) changed++;
}
console.log(`=== 67条实测(全正向) 新vs旧: 变化${changed}条, 最大Δ角=${maxdA.toExponential(1)}, 最大Δ力=${maxdP.toExponential(1)} (应≈0) ===`);

// 2. 新场景: 之前 null, 现在应返回
console.log('\n=== 新增场景(之前无结果) ===');
function show(label,dist,elev,wa,ws){
  console.log(label);
  const all=now.searchTrico3in1Physics(dist,20,'right',wa,ws,elev*EPPU);
  for(const n of [1,2,3,4]){
    const r=(all||[]).find(x=>x.spinN===n);
    console.log(`  N${n}: ${r?`${r.angle.toFixed(1)}° / ${r.power.toFixed(3)} [${r.source}]`:'无结果'}`);
  }
}
show('dist=20 落差-15 无风 右攻 (目标在下方, 应出现负角度):', 20, -15, 0, 0);
show('dist=10 落差0 风向56 风力26 右攻 (强顺风过冲, N3/N4应出现反向角):', 10, 0, 56, 26);
