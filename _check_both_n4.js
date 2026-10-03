// 检查 left:4 和 right:4 的 T_base 拟合, 并重新拟合系数
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const cur={right:{a:5.1551,b:-0.00594},left:{a:4.819,b:-0.018}};

for(const side of ['right','left']){
  const cn = side==='right'?'右':'左';
  const subs=[];
  for(const d of data){
    if(d.n!==4||d.distance<0||d.side!==cn)continue;
    const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
    const f=Math.max(0,(d.windStrength||0)-1);
    const wya=Math.sin(r)*f/MASS,eg=G-wya;
    const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
    const dc=vy*vy-2*eg*(d.elevation||0)*EP;
    if(dc<0)continue;
    const Tt=(vy+Math.sqrt(dc))/eg;
    subs.push({sd:d.distance,Tt});
  }
  subs.sort((a,b)=>a.sd-b.sd);
  console.log(`\n=== ${side}:4 (n=${subs.length}) ===`);
  console.log('sd     | T_true  T_base当前  diff');
  for(const s of subs){
    const Tb=cur[side].a+cur[side].b*s.sd;
    console.log(`${String(s.sd).padStart(6)} | ${s.Tt.toFixed(3)}  ${Tb.toFixed(3)}  ${(s.Tt-Tb>=0?'+':'')+(s.Tt-Tb).toFixed(3)}`);
  }
  // 当前MAE
  let maeC=0;for(const s of subs){maeC+=Math.abs(s.Tt-(cur[side].a+cur[side].b*s.sd));}
  console.log(`当前 ${cur[side].a}+(${cur[side].b})·sd  MAE=${(maeC/subs.length).toFixed(4)}`);
  // 重新拟合 T = a + b·sd
  let sx=0,sy=0,sxx=0,sxy=0,n=subs.length;
  for(const s of subs){sx+=s.sd;sy+=s.Tt;sxx+=s.sd*s.sd;sxy+=s.sd*s.Tt;}
  const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
  let maeN=0;for(const s of subs){maeN+=Math.abs(s.Tt-(a+b*s.sd));}
  console.log(`拟合 ${a.toFixed(4)}+(${b.toFixed(5)})·sd  MAE=${(maeN/n).toFixed(4)}`);
}
