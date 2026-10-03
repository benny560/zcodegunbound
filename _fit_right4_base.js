// 关键: 新数据是wa=90 ws=20(纯上风), T_true含风的影响.
// T_base应该是【无风】时间. 当前dT会扣掉风的影响.
// 但N2-N4的T_base拟合方式: 从有风实测反推T_true, 直接当T_base用.
//   也就是说, 当前timePhysicsNoWindT里的系数, 实际是"实测T_true的拟合",
//   不是严格的"无风T". dT再叠加风修正. 这有双重计算风险.
//
// 验证: 用新数据, 看dT扣减后, T_base该是多少
// T_true = T_base + dT(wy_acc)
// 新数据 wy_acc(90°,ws=20) = sin90·19/0.23 = 82.6
// dT = 0.0243 - 0.00066·82.6 = 0.0243 - 0.0545 = -0.030
// 所以 T_base = T_true - dT = T_true + 0.030
const G=430,MASS=0.23;
const data=[
  {sd:10,ws:20,Tt:5.1046},
  {sd:20,ws:20,Tt:5.0660},
  {sd:30,ws:20,Tt:5.0173},
  {sd:40,ws:21,Tt:4.9670},
];
console.log('=== 扣除风影响求T_base(无风时间) ===');
const subs=[];
for(const d of data){
  const force=Math.max(0,d.ws-1);
  const wya=Math.sin(90*Math.PI/180)*force/MASS;
  const dT=0.0243-0.00066*wya;
  const Tbase=d.Tt-dT;
  subs.push({sd:d.sd,Tbase});
  console.log(`sd=${d.sd} T_true=${d.Tt.toFixed(4)} dT=${dT.toFixed(4)} T_base=${Tbase.toFixed(4)}`);
}
console.log('');
// 拟合 T_base = a + b·sd
let sx=0,sy=0,sxx=0,sxy=0,n=subs.length;
for(const s of subs){sx+=s.sd;sy+=s.Tbase;sxx+=s.sd*s.sd;sxy+=s.sd*s.Tbase;}
const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
console.log(`扣除风影响后 T_base = ${a.toFixed(4)} + (${b.toFixed(5)})·sd`);
console.log('');
// 对比: 当前right:4 = 5.1551-0.00594 (这个是旧2样本wa=79反推的T_true拟合, 没扣风)
// 旧的left:4重拟合也没扣风(直接用T_true). 保持一致: 不扣风, 直接拟合T_true
console.log('=== 决策: 扣不扣风? ===');
console.log('当前left:4/right:4系数都是【直接拟合T_true】, 不扣dT. 保持一致.');
console.log('所以right:4新系数 = 直接拟合T_true = 5.1541 + (-0.00462)·sd');
console.log('');
// 但要注意: 旧2样本(wa=79 ws=24)的T_true和新的(wa=90 ws=20)风况不同.
// 一起拟合看一致性
console.log('=== 新4点+旧2点 一起拟合(验证一致性) ===');
const all=[...data.map(d=>({sd:d.sd,Tt:d.Tt})),{sd:9.5,Tt:5.188},{sd:37.13,Tt:4.935}];
let sx2=0,sy2=0,sxx2=0,sxy2=0,n2=all.length;
for(const s of all){sx2+=s.sd;sy2+=s.Tt;sxx2+=s.sd*s.sd;sxy2+=s.sd*s.Tt;}
const b2=(n2*sxy2-sx2*sy2)/(n2*sxx2-sx2*sx2),a2=(sy2-b2*sx2)/n2;
let maeAll=0;for(const s of all)maeAll+=Math.abs(s.Tt-(a2+b2*s.sd));
console.log(`6点拟合: T = ${a2.toFixed(4)} + (${b2.toFixed(5)})·sd  MAE=${(maeAll/n2).toFixed(4)}`);
console.log('sd    | T_true  T_6点    diff');
for(const s of all.sort((a,b)=>a.sd-b.sd)){
  console.log(`${String(s.sd).padStart(5)} | ${s.Tt.toFixed(3)}  ${(a2+b2*s.sd).toFixed(3)}  ${(s.Tt-(a2+b2*s.sd)>=0?'+':'')+(s.Tt-(a2+b2*s.sd)).toFixed(3)}`);
}
