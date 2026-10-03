// 对比: 开炮表v4的解析解(range_sd) vs 我的数值积分(sim) 在偏差点
// 两者应一致(同一ODE), 若不一致则其中一个有bug
const G=0.608, M=85.0, MC=0.005, IPS=0.4;
function mass(w){return M-MC*w*w;}
function wind_terms(wd,w){ if(w===0)return [0,G]; const m=mass(w); return [Math.cos(wd*Math.PI/180)*w/m, G-Math.sin(wd*Math.PI/180)*w/m]; }
// 开炮表v4的解析range_sd
function range_sd(A, Vo, wd, w){
  const [wax,gEff]=wind_terms(wd,w);
  if(gEff<=0)return Infinity;
  const Ar=A*Math.PI/180, T=2*Vo*Math.sin(Ar)/gEff;
  return (Vo*Math.cos(Ar)*T+0.5*wax*T*T)/IPS;
}
// 我的数值积分
function sim(power, ang, wa, ws, DT=0.0015){
  const m=mass(ws), war=wa*Math.PI/180;
  const xA=Math.cos(war)*ws/m, effGrav=G-Math.sin(war)*ws/m;
  let vx=power*Math.cos(ang*Math.PI/180),vy=power*Math.sin(ang*Math.PI/180),x=0,y=0,t=0;
  for(let i=0;i<200000;i++){vx+=xA*DT;vy-=effGrav*DT;x+=vx*DT;y+=vy*DT;t+=DT;if(y<0&&t>DT)break;if(t>20)break;}
  return x/IPS;
}

console.log('对比: 解析range_sd vs 数值sim (同物理, 应一致)');
console.log('(偏差点: 81_上 ws=15, 用表角度+力度3.967)\n');

// 复现开炮表的raise_angle: 固定P0[81]=3.967, 找使range_sd=20的角度
const P0_81 = 3.967;
function raiseAngle(wd, w){
  // 复刻 _boomer_export4.py 的 solve_all_angles + raise_angle
  function f(A){return range_sd(A, P0_81, wd, w) - 20;}
  const sols=[];
  let step=0.1, a=1.0, prev=f(a);
  while(a<90){
    const a2=Math.min(a+step,90); const cur=f(a2);
    if(prev===0)sols.push(a);
    else if(prev*cur<0){let lo=a,hi=a2; for(let i=0;i<60;i++){const mid=(lo+hi)/2; if(f(lo)*f(mid)<=0)hi=mid;else lo=mid;} sols.push((lo+hi)/2);}
    prev=cur; a=a2;
  }
  const hi=sols.filter(s=>s>=81-1e-9);
  return hi.length?hi.reduce((p,c)=>c-81<p-81?c:p):null;
}

const fs=require('fs');
const table=JSON.parse(fs.readFileSync('_boomer_table_v4.json','utf-8'));
const m=table.matrices['81_上'];

console.log('ws  wa  表角度   解析raise  数值落点(sd)  解析落点(sd)');
for (const e of m.entries){
  if(e.mode!=='angle'||e.ws<11)continue;
  if(![15,20,25].includes(e.ws))continue;
  const analytic=raiseAngle(e.wa,e.ws);
  const numLanding=sim(P0_81,e.angle,e.wa,e.ws);
  const anaLanding=range_sd(e.angle,P0_81,e.wa,e.ws);
  console.log(`${e.ws}  ${e.wa}  ${e.angle}   ${analytic?analytic.toFixed(2):'null'}     ${numLanding.toFixed(3)}       ${anaLanding.toFixed(3)}`);
}

console.log('\n关键: 如果 解析raise≈表角度 且 数值落点≠20, 说明数值积分和解析解不一致');
console.log('     如果 解析raise≈表角度 且 解析落点=20, 说明开炮表用解析解生成(自洽), 我的数值积分有偏差');

// 直接验证: 解析解和数值解在无风时是否一致
console.log('\n=== 无风对照 (应完全一致) ===');
for (const A of [50,70,81]){
  const ana=range_sd(A,P0_81,0,0);
  const num=sim(P0_81,A,0,0);
  console.log(`  ${A}°: 解析=${ana.toFixed(4)} 数值=${num.toFixed(4)} 差=${(ana-num).toFixed(5)}`);
}

// 强风点对照
console.log('\n=== 强风点 81° ws=15 wa=90 力3.967 ===');
for(const A of [82,84,86,88,90]){
  const ana=range_sd(A,P0_81,90,15);
  const num=sim(P0_81,A,90,15);
  console.log(`  ${A}°: 解析=${ana.toFixed(4)}sd 数值=${num.toFixed(4)}sd 差=${(ana-num).toFixed(4)}sd`);
}
