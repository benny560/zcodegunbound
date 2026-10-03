// 左右分开拟合 N3 的 T_base, 看左攻到底该用什么系数
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;

for(const sideKey of ['right','left']){
  const sub=[];
  for(const d of data){
    if(d.n!==3||d.distance<0)continue;
    const dir=d.side==='右'?'right':'left';
    if(dir!==sideKey)continue;
    const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
    const f=Math.max(0,(d.windStrength||0)-1);
    const wya=Math.sin(r)*f/MASS,eg=G-wya;
    const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
    const dc=vy*vy-2*eg*(d.elevation||0)*EP;
    if(dc<0)continue;const Tt=(vy+Math.sqrt(dc))/eg;
    sub.push({sd:d.distance,ws:d.windStrength,Tt,wya});
  }
  // 拟合 T = a + b*sd
  let sx=0,sy=0,sxx=0,sxy=0,n=sub.length;
  for(const s of sub){sx+=s.sd;sy+=s.Tt;sxx+=s.sd*s.sd;sxy+=s.sd*s.Tt;}
  const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
  // 对比当前 right:3 = 4.1243-0.01039*sd, left:3 = 3.4780-0.01085*sd
  const cur = sideKey==='right'?{a:4.1243,b:-0.01039}:{a:3.4780,b:-0.01085};
  let maeCur=0,maeNew=0;
  for(const s of sub){maeCur+=Math.abs(s.Tt-(cur.a+cur.b*s.sd));maeNew+=Math.abs(s.Tt-(a+b*s.sd));}
  console.log(`=== N3 ${sideKey} (n=${n}) ===`);
  console.log(`  当前系数: T = ${cur.a} + (${cur.b})*sd,  MAE=${(maeCur/n).toFixed(3)}`);
  console.log(`  v1拟合:   T = ${a.toFixed(4)} + (${b.toFixed(5)})*sd,  MAE=${(maeNew/n).toFixed(3)}`);
}
