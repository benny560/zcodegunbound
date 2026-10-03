// 精准校准dT: 控制 sd 不变, 看 wy_acc 对 T_true 的纯影响
// 方法: 对每个N, 取残差 dT_true = T_true - T_base_fit(sd), 然后看 dT_true vs wy_acc
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const fits={'1':{a:1.7998,b:-0.04357},'2':{a:2.8655,b:-0.01427},'3':{a:4.1243,b:-0.01039},'4':{a:5.1551,b:-0.00594}};

for(const n of [1,2,3,4]){
  const sub=[];
  for(const d of data){
    if(d.n!==n||d.distance<0)continue;
    const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
    const f=Math.max(0,(d.windStrength||0)-1);
    const xa=Math.cos(r)*f/MASS,wya=Math.sin(r)*f/MASS,eg=G-wya;
    const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
    const dc=vy*vy-2*eg*(d.elevation||0)*EP;
    if(dc<0)continue;const Tt=(vy+Math.sqrt(dc))/eg;
    const Tb=fits[n].a+fits[n].b*d.distance;
    sub.push({sd:d.distance,wy_acc:wya,xa,dT_true:Tt-Tb,T_true:Tt});
  }
  if(sub.length<5)continue;
  // 拟合 dT_true = c0 + c1*wy_acc (当前模型是 0.0243 - 0.00066*wy_acc)
  // 简单最小二乘
  let sx=0,sy=0,sxx=0,sxy=0,n2=sub.length;
  for(const s of sub){sx+=s.wy_acc;sy+=s.dT_true;sxx+=s.wy_acc*s.wy_acc;sxy+=s.wy_acc*s.dT_true;}
  const c1=(n2*sxy-sx*sy)/(n2*sxx-sx*sx);
  const c0=(sy-c1*sx)/n2;
  // MAE
  let mae_model=0,mae_fit=0;
  for(const s of sub){
    const dm=0.0243-0.00066*s.wy_acc;
    const df=c0+c1*s.wy_acc;
    mae_model+=Math.abs(s.dT_true-dm);mae_fit+=Math.abs(s.dT_true-df);
  }
  console.log(`N${n} (n=${n2}): dT_true = T_true - T_base(sd)`);
  console.log(`  当前模型:  dT = 0.0243 - 0.00066*wy_acc,  MAE=${(mae_model/n2).toFixed(4)}`);
  console.log(`  数据拟合:  dT = ${c0.toFixed(4)} + (${c1.toFixed(6)})*wy_acc, MAE=${(mae_fit/n2).toFixed(4)}`);
  console.log(`  dT_true 范围: [${Math.min(...sub.map(s=>s.dT_true)).toFixed(3)}, ${Math.max(...sub.map(s=>s.dT_true)).toFixed(3)}]`);
}
