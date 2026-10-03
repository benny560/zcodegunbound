// N3 的T_base拟合可能本身就有问题. 直接看 N3 无风/低风样本的 T_true vs sd
// 同时看: 当前fits里的系数到底从哪来的, 对不对
const fs=require('fs');
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;

// N3全部样本, 按距离排序, 列出T_true
console.log('=== N3 全部样本 T_true vs sd ===');
const sub=[];
for(const d of data){
  if(d.n!==3||d.distance<0)continue;
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const f=Math.max(0,(d.windStrength||0)-1);
  const wya=Math.sin(r)*f/MASS,eg=G-wya;
  const V=d.power/PF,ar=d.angle*Math.PI/180,vy=V*Math.sin(ar);
  const dc=vy*vy-2*eg*(d.elevation||0)*EP;
  if(dc<0)continue;const Tt=(vy+Math.sqrt(dc))/eg;
  sub.push({sd:d.distance,ws:d.windStrength,wa,Tt,side:d.side});
}
sub.sort((a,b)=>a.sd-b.sd);
const cur=4.1243-0.01039; // 当前T_base斜率
console.log('sd     ws wa   side | T_true  T_base(当前)  diff');
for(const s of sub){
  const Tb=4.1243-0.01039*s.sd;
  console.log(`${String(s.sd).padStart(6)} ${String(s.ws).padStart(2)} ${String(s.wa).padStart(3)} ${s.side} | ${s.Tt.toFixed(3)}  ${Tb.toFixed(3)}  ${(s.Tt-Tb>=0?'+':'')+(s.Tt-Tb).toFixed(3)}`);
}
// 重新拟合 N3: T = a + b*sd
let sx=0,sy=0,sxx=0,sxy=0,n=sub.length;
for(const s of sub){sx+=s.sd;sy+=s.Tt;sxx+=s.sd*s.sd;sxy+=s.sd*s.Tt;}
const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;
console.log(`\n当前N3 T_base: 4.1243 - 0.01039*sd`);
console.log(`重新拟合(v1数据): ${a.toFixed(4)} + (${b.toFixed(5)})*sd  (n=${n})`);
// 残差
let maeCur=0,maeNew=0;
for(const s of sub){maeCur+=Math.abs(s.Tt-(4.1243-0.01039*s.sd));maeNew+=Math.abs(s.Tt-(a+b*s.sd));}
console.log(`MAE 当前=${(maeCur/n).toFixed(3)}  新拟合=${(maeNew/n).toFixed(3)}`);
