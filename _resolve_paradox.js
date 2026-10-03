// 矛盾: 物理推导说 dT ∝ +wy_acc, 数据说 dT ∝ -wy_acc. 谁对?
//
// 我的物理推导漏洞: T=2vy/g_eff 假设 vy 不变. 但实测里 vy 是变的!
// 玩家打上风(wy_acc>0): 上风托球, 为了打中目标, 玩家用更小力度(更小vy),
//   所以实测 T = 2*vy_实测/g_eff, vy_变小抵消了g_eff变小, 净效果T减小.
// 玩家打下风(wy_acc<0): 下风压球, 玩家用更大力度(更大vy)高抛,
//   vy_变大但g_eff也变大, 实测看净效果.
//
// 所以 T=2vy/g_eff 里的vy不是常数! 我的推导错了.
// 实测的dT反映的是【玩家调整后】的T, 包含了vy的变化.
// 数据说的才是真的: dT ∝ -wy_acc (上风实测T减小, 下风实测T增大).
//
// 等等, 这和图片场景矛盾. 图片wa=338下风(wy_acc<0):
//   dT_true = T_true - T_base = 3.903 - 3.917 = -0.014 (接近0, 略减)
//   当前dT公式 = 0.0243 - 0.00066*(-40.7) = 0.051 (增大)
//   所以当前公式给dT=+0.051, 实测dT=-0.014, 差0.065!
// 当前公式说下风增大T(+0.051), 实测说下风略减T(-0.014).
//
// 但数据拟合 corr(dT,wy_acc)<0 意味着 wy_acc<0时 dT>0?? 验证符号:
// corr<0: wy_acc增大时dT减小. wy_acc<0(下风)时, wy_acc是负的, dT应该大(正).
// 这和图片场景dT_true=-0.014矛盾!
//
// 哦! 问题在T_base. 不同样本sd不同, T_base不同, 单纯corr(dT,wy_acc)被sd混淆了.
// 让我控制sd, 只看近距或同距样本.
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
// 只看N3右攻, 直接看 (T_true, wy_acc, xa)
const sub=[];
for(const d of data){
  if(d.n!==3||d.distance<0||d.side!=='右')continue;
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const xa=Math.cos(r)*f/MASS,wya=Math.sin(r)*f/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0)continue;const Tt=(vy+Math.sqrt(dc))/eg;
  sub.push({sd:d.distance,ws:d.windStrength,wa,Tt,wya,xa,vy});
}
console.log('N3右攻全样本 (按wy_acc排序):');
console.log('sd    wa ws | wy_acc  xa    vy    T_true');
for(const s of sub.sort((a,b)=>a.wya-b.wya)){
  console.log(`${String(s.sd).padStart(5)} ${String(s.wa).padStart(3)} ${String(s.ws).padStart(2)} | ${s.wya.toFixed(1).padStart(6)} ${s.xa.toFixed(1).padStart(5)} ${s.vy.toFixed(0).padStart(5)} ${s.Tt.toFixed(3)}`);
}
