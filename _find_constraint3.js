// 找第3约束: 分析实测里 xErrSD(球飞过目标的距离) 和什么变量相关
// xErrSD = (xLand - xDist)/40, xLand = V·cosA·T + 0.5·xA·T²
const fs=require('fs');
const G=430,MASS=0.23,PF=0.004332712,EP=516/13;
const effWa=(side,wa)=>side==='左'?((180-wa)%360+360)%360:wa;
const data=JSON.parse(fs.readFileSync('_real_v1.json','utf8'));

// 收集所有样本的 (n, side, sd, angle, power, wa_eff, ws, xErrSD, T_true)
const rows=[];
for(const d of data){
  if(d.distance<0)continue;
  const dir=d.side==='右'?'right':'left';
  const wa=effWa(d.side,d.windAngle);const r=wa*Math.PI/180;
  const force=Math.max(0,(d.windStrength||0)-1);
  const xA=Math.cos(r)*force/MASS, wya=Math.sin(r)*force/MASS, eg=G-wya;
  const V=d.power/PF, ar=d.angle*Math.PI/180;
  const vx=V*Math.cos(ar), vy=V*Math.sin(ar);
  const elevPx=(d.elevation||0)*EP;
  const disc=vy*vy-2*eg*elevPx;
  if(disc<0)continue;
  const T=(vy+Math.sqrt(disc))/eg;
  const xLand=vx*T+0.5*xA*T*T;
  const xDist=d.distance*40;
  rows.push({
    n:d.n, side:dir, sd:d.distance, angle:d.angle, power:d.power,
    wa_eff:wa, ws:d.windStrength||0, force, xA, wya, eg,
    T, xLand, xDist, xErrSD:(xLand-xDist)/40,
    cosW:Math.cos(r), sinW:Math.sin(r)
  });
}
console.log(`共${rows.length}个正向样本`);

// 1. xErrSD 按N和side分组统计
console.log('\n=== xErrSD 按 N+side 分组 ===');
for(const n of [1,2,3,4]){
  for(const side of ['right','left']){
    const sub=rows.filter(r=>r.n===n&&r.side===side);
    if(sub.length<3)continue;
    const m=sub.reduce((s,r)=>s+r.xErrSD,0)/sub.length;
    const sd=sub.reduce((s,r)=>s+Math.abs(r.xErrSD-m),0)/sub.length;
    console.log(`  N${n} ${side}(n=${sub.length}): xErrSD mean=${m.toFixed(3)} SD=${sd.toFixed(3)} range=[${Math.min(...sub.map(r=>r.xErrSD)).toFixed(2)},${Math.max(...sub.map(r=>r.xErrSD)).toFixed(2)}]`);
  }
}

// 2. xErrSD 和各变量的相关性 (全量)
function corr(xs,ys){
  const mx=xs.reduce((a,b)=>a+b,0)/xs.length, my=ys.reduce((a,b)=>a+b,0)/ys.length;
  let num=0,dx=0,dy=0;
  for(let i=0;i<xs.length;i++){num+=(xs[i]-mx)*(ys[i]-my);dx+=(xs[i]-mx)**2;dy+=(ys[i]-my)**2;}
  return num/Math.sqrt(dx*dy);
}
const xE=rows.map(r=>r.xErrSD);
console.log('\n=== xErrSD 相关性 ===');
console.log(`corr(xErrSD, angle) = ${corr(rows.map(r=>r.angle),xE).toFixed(3)}`);
console.log(`corr(xErrSD, sd)    = ${corr(rows.map(r=>r.sd),xE).toFixed(3)}`);
console.log(`corr(xErrSD, power) = ${corr(rows.map(r=>r.power),xE).toFixed(3)}`);
console.log(`corr(xErrSD, T)     = ${corr(rows.map(r=>r.T),xE).toFixed(3)}`);
console.log(`corr(xErrSD, wa_eff)= ${corr(rows.map(r=>r.wa_eff),xE).toFixed(3)}`);
console.log(`corr(xErrSD, ws)    = ${corr(rows.map(r=>r.ws),xE).toFixed(3)}`);
console.log(`corr(xErrSD, xA)    = ${corr(rows.map(r=>r.xA),xE).toFixed(3)}`);
console.log(`corr(xErrSD, wya)   = ${corr(rows.map(r=>r.wya),xE).toFixed(3)}`);

// 3. 只看N3右攻(数据多), xErrSD vs angle 和 sd
console.log('\n=== N3 right: xErrSD 详细 ===');
const n3r=rows.filter(r=>r.n===3&&r.side==='right').sort((a,b)=>a.sd-b.sd);
console.log('sd   angle wa ws | xErrSD  T      xLand  xDist');
for(const r of n3r){
  console.log(`${String(r.sd).padStart(5)} ${String(r.angle).padStart(3)} ${String(r.wa_eff).padStart(3)} ${String(r.ws).padStart(2)} | ${(r.xErrSD>=0?'+':'')+r.xErrSD.toFixed(2)}  ${r.T.toFixed(3)} ${r.xLand.toFixed(0)}  ${r.xDist.toFixed(0)}`);
}
