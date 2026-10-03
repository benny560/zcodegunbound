// 从实测角度+力度, 精确反推每个点需要的T(让角度和力度都中)
// 然后看 T_exact vs sd 的关系, 和当前模型对比
const G=430,MASS=0.23,PF=0.004332712;
const tests=[
  {sd:10,ws:20,a:84.4,p:3.86},
  {sd:20,ws:20,a:79.3,p:3.88},
  {sd:30,ws:20,a:73.9,p:3.93},
  {sd:40,ws:21,a:68.4,p:3.97},
];
console.log('=== 从实测精确反推T (wa=90纯上风) ===');
console.log('sd ws | angle power | wy_acc  effGrav | T_exact(y方程)');
const subs=[];
for(const t of tests){
  const wa=90;r=wa*Math.PI/180;
  const force=Math.max(0,t.ws-1);
  const wya=Math.sin(r)*force/MASS,eg=G-wya;
  const V=t.p/PF,ar=t.a*Math.PI/180,vy=V*Math.sin(ar);
  const T=2*vy/eg; // 平地落地T
  subs.push({sd:t.sd,ws:t.ws,T});
  console.log(`${String(t.sd).padStart(3)} ${String(t.ws).padStart(2)} | ${t.a} ${t.p} | ${wya.toFixed(2)}  ${eg.toFixed(1)} | ${T.toFixed(4)}`);
}
console.log('');
// 这4个T_exact是含风的(wa=90 ws=20). 当前模型: T = T_base + dT(wy_acc)
// 这4点 wy_acc: ws=20->force=19->wya=19/0.23=82.61; ws=21->force=20->wya=86.96
// dT = 0.0243-0.00066*wya
// T_base = T_exact - dT
console.log('=== 反推 T_base(=T_exact - dT) ===');
const bases=[];
for(const s of subs){
  const force=Math.max(0,s.ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS;
  const dT=0.0243-0.00066*wya;
  const Tb=s.T-dT;
  bases.push({sd:s.sd,Tb});
  console.log(`sd=${s.sd} T_exact=${s.T.toFixed(4)} dT=${dT.toFixed(4)} T_base=${Tb.toFixed(4)}`);
}
console.log('');
// 拟合 T_base = a + b·sd
let sx=0,sy=0,sxx=0,sxy=0,n=bases.length;
for(const s of bases){sx+=s.sd;sy+=s.Tb;sxx+=s.sd*s.sd;sxy+=s.sd*s.Tb;}
const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
console.log(`T_base拟合(扣dT后): ${a.toFixed(4)} + (${b.toFixed(5)})·sd`);
console.log('');
// 关键检验: 如果用这个T_base + 当前dT, 4点是否完全准?
console.log('=== 用扣dT后的T_base + 当前dT 验证4点 ===');
for(const t of tests){
  const force=Math.max(0,t.ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS,eg=G-wya;
  const xA=Math.cos(90*Math.PI/180)*force/MASS; // 0
  const dT=0.0243-0.00066*wya;
  const T=a+b*t.sd+dT;
  const xDist=t.sd*40;
  const denom=xDist-0.5*xA*T*T;
  const tanA=(0+0.5*eg*T*T)/denom;
  const ang=Math.atan(tanA)*180/Math.PI;
  const V=denom/(Math.cos(ang*Math.PI/180)*T);
  const p=V*PF;
  console.log(`sd=${t.sd}: pred ${ang.toFixed(2)}°/${p.toFixed(3)} (实测${t.a}/${t.p}) 角度差${(ang-t.a).toFixed(2)} 力度差${(p-t.p).toFixed(3)}`);
}
