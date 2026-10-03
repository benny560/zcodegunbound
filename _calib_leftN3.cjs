// 【标定v2】left:3 反推 xErrSD 使 求解无风=识别表; 试多种拟合选最优; 修正迭代
// 用法: node _calib_leftN3.cjs
const fs=require('fs'), vm=require('vm');
const s=fs.readFileSync('gunbound_calculator.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const fe=()=>({value:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){},getAttribute(){return null;},appendChild(){},removeChild(){},querySelectorAll(){return[];},querySelector(){return fe();},addEventListener(){},removeEventListener(){},dispatchEvent(){return true;},getContext(){return{scale(){},translate(){},save(){},restore(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},arc(){},fill(){},stroke(){},fillText(){},fillRect(){},strokeRect(){},rect(){},closePath(){},setTransform(){},measureText(){return{width:0};},createLinearGradient(){return{addColorStop(){}};},setLineDash(){},drawImage(){}};},options:[],children:[],innerHTML:'',checked:false,parentElement:null,focus(){},blur(){},click(){},scrollIntoView(){}});
const sb={document:{getElementById(){return fe();},querySelector(){return fe();},querySelectorAll(){return[];},createElement(){return fe();},addEventListener(){},documentElement:{setAttribute(){}},visibilityState:'visible'},localStorage:{getItem(){return null;},setItem(){},removeItem(){}},navigator:{},window:{},requestAnimationFrame(){},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},addEventListener(){},removeEventListener(){},alert(){},prompt(){return null;},confirm(){return false;},console,Math,Date,JSON,parseInt,parseFloat,isNaN,isFinite,Number,Array,Object,String,Boolean,PI:Math.PI,Event:function(){},CustomEvent:function(){},getComputedStyle(){return{getPropertyValue(){return'';}};},matchMedia(){return{matches:false,addEventListener(){}};},innerWidth:1280,innerHeight:800,devicePixelRatio:1,location:{href:'',search:''}};
sb.window=sb;sb.self=sb;sb.globalThis=sb;vm.createContext(sb);
vm.runInContext(s+';globalThis.__api={EXCEL_TRICO};',sb,{filename:'c.js',timeout:30000});
const E=sb.__api.EXCEL_TRICO;
const PF=0.004332712, G=430, MASS=0.23;
const Tfit=E.timePhysicsNoWindT['left:3'];

// 1. 反推精确 xErrSD(sd) 使 求解无风角度=识别表角度
const pts=[];
for(let sd=13; sd<=50; sd++){
  const anc=E.getEmpiricalPhaseAnchor('left',3,sd); if(!anc) continue;
  const T0=Tfit.a+Tfit.b*sd + 0.0243, xDist=sd*40;
  const xDistEff=0.5*G*T0*T0/Math.tan(anc.angle*Math.PI/180);
  pts.push({sd, angle:anc.angle, xErrSD:(xDistEff-xDist)/40});
}
// 多项式最小二乘(vandermonde正规方程, 阶数deg, 变量x)
function polyfit(xs,ys,deg){
  const n=xs.length, m=deg+1, A=Array.from({length:m},()=>new Array(m).fill(0)), b=new Array(m).fill(0);
  for(let i=0;i<n;i++){const p=[];let v=1;for(let k=0;k<m;k++){p.push(v);v*=xs[i];}for(let r=0;r<m;r++){b[r]+=p[r]*ys[i];for(let c=0;c<m;c++)A[r][c]+=p[r]*p[c];}}
  // 高斯消元
  for(let i=0;i<m;i++){let piv=i;for(let r=i+1;r<m;r++)if(Math.abs(A[r][i])>Math.abs(A[piv][i]))piv=r;[A[i],A[piv]]=[A[piv],A[i]];[b[i],b[piv]]=[b[piv],b[i]];for(let r=0;r<m;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<m;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i];}}
  return A.map((row,i)=>b[i]/row[i]);
}
function evalpoly(co,x){let v=0,p=1;for(const c of co){v+=c*p;p*=x;}return v;}
function res(co,xs,ys){let mx=0;for(let i=0;i<xs.length;i++)mx=Math.max(mx,Math.abs(evalpoly(co,xs[i])-ys[i]));return mx;}

const ang=pts.map(p=>p.angle), sdA=pts.map(p=>p.sd), y=pts.map(p=>p.xErrSD);
const fits={
  'angle-1':polyfit(ang,y,1), 'angle-2':polyfit(ang,y,2),
  'sd-1':polyfit(sdA,y,1), 'sd-2':polyfit(sdA,y,2),
};
console.log('拟合残差(最大|xErrSD误差|):');
for(const k in fits) console.log(`  ${k}: 残差=${res(fits[k], k.startsWith('angle')?ang:sdA, y).toFixed(4)}  系数=[${fits[k].map(c=>c.toFixed(6)).join(', ')}]`);

// 选 angle-2 做验证(自变量=求解角度, 迭代方便)
const co=fits['angle-2'];
const xerr=(a)=>evalpoly(co,a);
function solveNoWind(sd){
  const T0=Tfit.a+Tfit.b*sd+0.0243, xDist=sd*40; let xe=0,a=60;
  for(let i=0;i<12;i++){const d=xDist+xe*40;a=Math.atan(0.5*G*T0*T0/d)*180/Math.PI;const nx=xerr(a);if(Math.abs(nx-xe)<1e-7){xe=nx;break;}xe=nx;}
  const d=xDist+xe*40,V=d/(Math.cos(a*Math.PI/180)*T0);return{a,p:V*PF};
}
console.log('\n验证 识别 vs 求解(加 angle-2 拟合, 修正迭代):');
console.log('sd | 识别A/P    | 求解A/P新  | ΔA    ΔP');
let mxdA=0;
for(const sd of[15,20,25,30,35,40,45,49]){
  const anc=E.getEmpiricalPhaseAnchor('left',3,sd), s2=solveNoWind(sd);
  const dA=s2.a-anc.angle; mxdA=Math.max(mxdA,Math.abs(dA));
  console.log(`${String(sd).padStart(2)} | ${anc.angle.toFixed(1)}/${anc.power.toFixed(3)} | ${s2.a.toFixed(1)}/${s2.p.toFixed(3)} | ${(dA>=0?'+':'')+dA.toFixed(2)} ${(s2.p-anc.power>=0?'+':'')+(s2.p-anc.power).toFixed(3)}`);
}
console.log('  无风角度最大残差 ΔA =', mxdA.toFixed(3),'°');

// 实测 left:3 wind 落点
const data=JSON.parse(fs.readFileSync('_excel_real.json','utf8'));
const sub=data.filter(d=>d.side==='左'&&d.n===3&&d.distance>0);
function solveWind(sd,elevUI,waEff,ws,useOff){
  const wr=waEff*Math.PI/180,cosW=Math.cos(wr),sinW=Math.sin(wr);
  const force=ws===0?0:(Math.abs(cosW+1)<0.001?ws:Math.max(0,ws-1));
  const xA=cosW*force/MASS,effG=G-sinW*force/MASS; if(effG<=0)return null;
  const T=Tfit.a+Tfit.b*sd+(0.0243-0.00066*(sinW*force/MASS)),xDist=sd*40,elev=elevUI*516/13;
  let a=60,xe=0;for(let i=0;i<12;i++){const d=(xDist+(useOff?xe:0)*40)-0.5*xA*T*T;a=Math.atan((elev+0.5*effG*T*T)/d)*180/Math.PI;const nx=useOff?xerr(a):0;if(Math.abs(nx-xe)<1e-7){xe=nx;break;}xe=nx;}
  const d=(xDist+(useOff?xe:0)*40)-0.5*xA*T*T,V=d/(Math.cos(a*Math.PI/180)*T);return{a,p:V*PF,xA,effG};
}
function land(a,p,xA,effG,elevPx){const V=p/PF,ar=a*Math.PI/180,vy=V*Math.sin(ar),vx=V*Math.cos(ar);const disc=vy*vy-2*effG*elevPx;if(disc<0)return null;const T=(vy+Math.sqrt(disc))/effG;return vx*T+0.5*xA*T*T;}
let m0=0,mf=0,c=0;
for(const d of sub){
  const waEff=((180-d.windAngle)%360+360)%360, elevPx=(d.elevation||0)*516/13;
  const s0=solveWind(d.distance,d.elevation||0,waEff,d.windStrength,false), sf=solveWind(d.distance,d.elevation||0,waEff,d.windStrength,true);
  if(!s0||!sf)continue; const lr=land(d.angle,d.power,s0.xA,s0.effG,elevPx),l0=land(s0.a,s0.p,s0.xA,s0.effG,elevPx),lf=land(sf.a,sf.p,sf.xA,sf.effG,elevPx);
  if(lr==null||l0==null||lf==null)continue; m0+=Math.abs((l0-lr)/40);mf+=Math.abs((lf-lr)/40);c++;
}
console.log(`\n实测left:3 wind落点|miss| (${c}条): 修前=${(m0/c).toFixed(2)}SD -> 修后=${(mf/c).toFixed(2)}SD`);
