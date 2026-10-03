// 新数据: right:4, wa=90纯上风, ws≈20
// sd=10 ws=20 -> 84.4/3.86
// sd=20 ws=20 -> 79.3/3.88
// sd=30 ws=20 -> 73.9/3.93
// sd=40 ws=21 -> 68.4/3.97
// 反推真实T, 拟合 T_base
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const data=[
  {sd:10,ws:20,angle:84.4,power:3.86},
  {sd:20,ws:20,angle:79.3,power:3.88},
  {sd:30,ws:20,angle:73.9,power:3.93},
  {sd:40,ws:21,angle:68.4,power:3.97},
];
console.log('=== 反推真实T (wa=90纯上风) ===');
console.log('sd   ws | angle power | vy      effGrav  T_true');
const subs=[];
for(const d of data){
  const wa=90;const r=wa*Math.PI/180;
  const force=Math.max(0,d.ws-1);
  const wya=Math.sin(r)*force/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  // elev=0
  const Tt=2*vy/eg; // 平地落地时间
  subs.push({sd:d.sd,Tt});
  console.log(`${String(d.sd).padStart(3)} ${String(d.ws).padStart(2)} | ${d.angle} ${d.power} | ${vy.toFixed(1)}  ${eg.toFixed(1)}  ${Tt.toFixed(4)}`);
}
console.log('');
// 对比当前 right:4 = 5.1551-0.00594·sd
const cur={a:5.1551,b:-0.00594};
console.log('=== 对比当前系数 ===');
console.log('sd   | T_true  T_base当前   diff');
for(const s of subs){
  const Tb=cur.a+cur.b*s.sd;
  console.log(`${String(s.sd).padStart(3)} | ${s.Tt.toFixed(3)}  ${Tb.toFixed(3)}  ${(s.Tt-Tb>=0?'+':'')+(s.Tt-Tb).toFixed(3)}`);
}
let maeC=0;for(const s of subs)maeC+=Math.abs(s.Tt-(cur.a+cur.b*s.sd));
console.log(`当前 MAE=${(maeC/subs.length).toFixed(4)}`);
console.log('');
// 重新拟合 T = a + b·sd (只用这4个新数据)
let sx=0,sy=0,sxx=0,sxy=0,n=subs.length;
for(const s of subs){sx+=s.sd;sy+=s.Tt;sxx+=s.sd*s.sd;sxy+=s.sd*s.Tt;}
const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
let maeN=0;for(const s of subs)maeN+=Math.abs(s.Tt-(a+b*s.sd));
console.log(`=== 4点拟合(仅新数据) ===`);
console.log(`T = ${a.toFixed(4)} + (${b.toFixed(5)})·sd  MAE=${(maeN/n).toFixed(4)}`);
console.log('sd   | T_true  T_new     diff');
for(const s of subs){
  const Tn=a+b*s.sd;
  console.log(`${String(s.sd).padStart(3)} | ${s.Tt.toFixed(3)}  ${Tn.toFixed(3)}  ${(s.Tt-Tn>=0?'+':'')+(s.Tt-Tn).toFixed(3)}`);
}
// 合并旧2样本+新4样本一起拟合
console.log('');
const all=[...subs,{sd:9.5,Tt:5.188},{sd:37.13,Tt:4.935}]; // 旧的2个(注意这俩是wa=79 ws=24不是纯上风)
// 旧样本是不同风况, T_true含风的影响, 不能直接和纯上风基准混.
console.log('注: 旧2样本(wa=79 ws=24)和新4样本(wa=90 ws=20)风况不同, 不合并拟合.');
