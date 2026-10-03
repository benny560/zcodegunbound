// 用4个实测点重新拟合 right N4 的 rot/pi(sd)
// 实测反推的 turns≈3.43 (rot/pi = turns*2 ≈ 6.86)
// 拟合 rot_pi(sd) = c0 + c1·sd + c2·sd²
const tests=[
  {sd:10,rotPi:3.4492*2},{sd:20,rotPi:3.4366*2},
  {sd:30,rotPi:3.4370*2},{sd:40,rotPi:3.4290*2},
];
console.log('实测反推 rot/pi:');
for(const t of tests) console.log(`  sd=${t.sd} rotPi=${t.rotPi.toFixed(4)}`);
console.log('');
// 4点几乎平的(~6.87), 线性拟合即可
let sx=0,sy=0,sxx=0,sxy=0,syy=0,n=tests.length;
for(const t of tests){sx+=t.sd;sy+=t.rotPi;sxx+=t.sd*t.sd;sxy+=t.sd*t.rotPi;syy+=t.rotPi*t.rotPi;}
const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
console.log(`线性拟合: rot_pi = ${a.toFixed(4)} + (${b.toFixed(6)})·sd`);
let maeL=0;for(const t of tests)maeL+=Math.abs(t.rotPi-(a+b*t.sd));
console.log(`线性 MAE=${(maeL/n).toFixed(5)}`);
// 也试二次
const c2 = (n*(sxy-sx*sy/n) - (sxx-sx*sx/n)*n) / (n*(tests.reduce((s,t)=>s+t.sd*t.sd*t.sd,0)-sx*sxx/n)); // 太复杂,直接看数据
console.log('');
console.log('结论: 4点rot/pi几乎恒定6.87, 不随sd变化.');
console.log('  外推法(2*N3-N2)给7.7-7.9, 偏高0.9(=0.45圈).');
console.log('  外推法错误原因: N3->N4不是线性递减, 实际N4圈数(3.43)远小于外推值(3.9).');
console.log('');
// 用常数 6.87 试试
console.log('=== 用实测rotPi重新求解4标准点 ===');
const G=430,MASS=0.23,PF=0.004332712;
const omegaRight = V => 0.023623 * Math.pow(V, 0.764315);
function solve(sd, ws, rotPiTarget){
  const force=Math.max(0,ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS, eg=G-wya;
  const xA=Math.cos(90*Math.PI/180)*force/MASS; // 0
  const xDist=sd*40;
  let T=4.0;
  for(let i=0;i<100;i++){
    const denom=xDist-0.5*xA*T*T;
    const tanA=(0+0.5*eg*T*T)/denom;
    const ang=Math.atan(tanA)*180/Math.PI;
    const V=denom/(Math.cos(ang*Math.PI/180)*T);
    const om=omegaRight(V);
    const Tn=rotPiTarget*Math.PI/om;
    if(Math.abs(Tn-T)<1e-4)break;
    T=0.5*(T+Tn);
  }
  const denom=xDist-0.5*xA*T*T;
  const tanA=(0+0.5*eg*T*T)/denom;
  const ang=Math.atan(tanA)*180/Math.PI;
  const V=denom/(Math.cos(ang*Math.PI/180)*T);
  return {angle:ang, power:V*PF, T, turns:omegaRight(V)*T/(2*Math.PI)};
}
console.log('sd ws | 实测 | 用外推rotPi(7.9) | 用实测rotPi(6.87)');
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},{sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97}]){
  const r1=solve(t.sd,t.ws,7.9144-0.01168*t.sd+0.0001761*t.sd*t.sd);
  const r2=solve(t.sd,t.ws,6.87);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p} | ${r1.angle.toFixed(2)}/${r1.power.toFixed(3)} | ${r2.angle.toFixed(2)}/${r2.power.toFixed(3)}`);
}

console.log('\n=== 用线性拟合rotPi(6.906-0.0012sd) 精修 ===');
console.log('sd ws | 实测 | 用线性rotPi');
let mA=0,mP=0;
for(const t of [{sd:10,ws:20,a:84.4,p:3.86},{sd:20,ws:20,a:79.3,p:3.88},{sd:30,ws:20,a:73.9,p:3.93},{sd:40,ws:21,a:68.4,p:3.97}]){
  const rp=6.9060-0.001204*t.sd;
  const r=solve(t.sd,t.ws,rp);
  const eA=r.angle-t.a,eP=r.power-t.p;
  mA+=Math.abs(eA);mP+=Math.abs(eP);
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a}/${t.p} | ${r.angle.toFixed(2)}/${r.power.toFixed(3)} (${(eA>=0?'+':'')+eA.toFixed(2)}°/${(eP>=0?'+':'')+eP.toFixed(3)})`);
}
console.log(`MAE: dA=${(mA/4).toFixed(2)}° dP=${(mP/4).toFixed(3)}`);
